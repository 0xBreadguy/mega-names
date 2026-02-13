// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Base64} from "solady/utils/Base64.sol";
import {LibString} from "solady/utils/LibString.sol";
import {Ownable} from "solady/auth/Ownable.sol";
import {MegaNamesSVG} from "./MegaNamesSVG.sol";

/// @notice Minimal interface to read from the MegaNames contract
interface IMegaNames {
    function records(uint256 tokenId) external view returns (
        string memory label, uint256 parent, uint64 expiresAt, uint64 epoch, uint64 parentEpoch
    );
}

/// @title MegaNameRenderer
/// @notice Stateless external tokenURI renderer — reads only from MegaNames contract
contract MegaNameRenderer is Ownable {
    using LibString for uint256;

    IMegaNames public immutable megaNames;

    constructor(address _megaNames) payable {
        _initializeOwner(tx.origin);
        megaNames = IMegaNames(_megaNames);
    }

    /*//////////////////////////////////////////////////////////////
                            TOKEN URI
    //////////////////////////////////////////////////////////////*/

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        (string memory label, uint256 parent, uint64 expiresAt, , uint64 parentEpoch) = megaNames.records(tokenId);

        if (parent != 0) {
            (,,, uint64 peCurr,) = megaNames.records(parent);
            if (parentEpoch != peCurr) return MegaNamesSVG.invalidMetadata();
        } else if (expiresAt < block.timestamp) {
            return MegaNamesSVG.expiredMetadata();
        }

        return _render(label, parent, expiresAt);
    }

    function _render(string memory label, uint256 parent, uint64 expiresAt)
        internal view returns (string memory)
    {
        string memory fullName = _buildName(label, parent);
        string memory displayName = _makeDisplay(fullName);
        bool isSub = parent != 0;
        uint256 labelLen = bytes(label).length;
        // Tier is based on the root parent label length, not the subdomain label
        uint256 tierLen = isSub ? _rootLabelLen(parent) : labelLen;
        string memory svg = _svg(displayName, tierLen, labelLen, expiresAt, isSub);
        return _encode(fullName, svg, tierLen, labelLen, expiresAt, isSub);
    }

    function _buildName(string memory label, uint256 parent) internal view returns (string memory) {
        if (parent != 0) {
            (string memory pLabel, uint256 grandParent,,,) = megaNames.records(parent);
            string memory parentName = _buildName(pLabel, grandParent);
            // parentName already ends with ".mega", so insert before it
            return string.concat(label, ".", parentName);
        }
        return string.concat(label, ".mega");
    }

    function _makeDisplay(string memory fullName) internal pure returns (string memory) {
        if (bytes(fullName).length <= 20) return fullName;
        return string.concat(_trunc(fullName, 17), "...");
    }

    function _encode(string memory fullName, string memory svg, uint256 tierLen, uint256 labelLen, uint64 expiresAt, bool isSub)
        internal pure returns (string memory)
    {
        string memory n = MegaNamesSVG.escapeJSON(fullName);
        string memory img = Base64.encode(bytes(svg));
        string memory attr = _attrs(tierLen, labelLen, expiresAt, isSub);

        return string.concat(
            "data:application/json;base64,",
            Base64.encode(bytes(string.concat(
                '{"name":"', n, '","description":"MegaNames: ', n,
                '","image":"data:image/svg+xml;base64,', img, '"', attr, '}'
            )))
        );
    }

    /*//////////////////////////////////////////////////////////////
                          SVG
    //////////////////////////////////////////////////////////////*/

    function _svg(string memory displayName, uint256 tierLen, uint256 labelLen, uint64 expiresAt, bool isSub)
        internal pure returns (string memory)
    {
        uint8 tier = tierLen >= 5 ? 5 : uint8(tierLen);
        string memory part1 = string.concat(_svgOpen(), _svgBg(tier));
        string memory part2 = string.concat(_svgCorners(), _svgTierIcon(tier));
        string memory part3 = string.concat(_svgName(displayName), _svgInfo(labelLen, expiresAt, isSub), _svgClose());
        return string.concat(part1, part2, part3);
    }

    function _svgOpen() internal pure returns (string memory) {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">'
            '<defs>'
            '<pattern id="g" width="100" height="100" patternUnits="userSpaceOnUse">'
            '<path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(68,68,68,0.15)" stroke-width="0.5"/></pattern>'
            '</defs>';
    }

    function _svgBg(uint8 tier) internal pure returns (string memory) {
        return string.concat(
            '<rect width="400" height="400" fill="#CECEC9"/>'
            '<rect width="400" height="400" fill="url(#g)"/>'
            '<rect width="400" height="400" fill="', _tierBgFill(tier), '"/>'
        );
    }

    function _svgCorners() internal pure returns (string memory) {
        return '<path d="M 16 16 L 16 32 M 16 16 L 32 16" fill="none" stroke="rgba(25,25,26,0.20)" stroke-width="1"/>'
            '<path d="M 384 16 L 384 32 M 384 16 L 368 16" fill="none" stroke="rgba(25,25,26,0.20)" stroke-width="1"/>'
            '<path d="M 16 384 L 16 368 M 16 384 L 32 384" fill="none" stroke="rgba(25,25,26,0.20)" stroke-width="1"/>'
            '<path d="M 384 384 L 384 368 M 384 384 L 368 384" fill="none" stroke="rgba(25,25,26,0.20)" stroke-width="1"/>';
    }

    function _svgTierIcon(uint8 tier) internal pure returns (string memory) {
        string memory ac = _tierAccent(tier);
        string memory al = _tierBgFill(tier);
        if (tier == 1) {
            return string.concat(
                '<polygon points="360,28 370,42 360,56 350,42" fill="none" stroke="', ac, '" stroke-width="1.5"/>'
                '<polygon points="360,34 364,42 360,50 356,42" fill="', al, '"/>'
            );
        }
        if (tier == 2) {
            return string.concat(
                '<polygon points="352,28 358,42 352,56 346,42" fill="none" stroke="', ac, '" stroke-width="1.2"/>'
                '<polygon points="368,28 374,42 368,56 362,42" fill="none" stroke="', ac, '" stroke-width="1.2"/>'
            );
        }
        if (tier == 3) {
            return string.concat(
                '<polygon points="360,28 372,35 372,49 360,56 348,49 348,35" fill="none" stroke="', ac, '" stroke-width="1.2"/>'
                '<circle cx="360" cy="42" r="6" fill="', al, '"/>'
            );
        }
        if (tier == 4) {
            return string.concat(
                '<polygon points="360,28 374,39 369,55 351,55 346,39" fill="none" stroke="', ac, '" stroke-width="1"/>'
                '<circle cx="360" cy="42" r="4" fill="', al, '"/>'
            );
        }
        return string.concat(
            '<circle cx="360" cy="42" r="12" fill="none" stroke="', ac, '" stroke-width="0.8"/>'
            '<circle cx="360" cy="42" r="3" fill="', ac, '"/>'
        );
    }

    function _svgName(string memory displayName) internal pure returns (string memory) {
        uint256 len = bytes(displayName).length;
        string memory fs; string memory yp;
        if (len <= 6) { fs = "72"; yp = "196"; }
        else if (len <= 10) { fs = "48"; yp = "190"; }
        else if (len <= 15) { fs = "34"; yp = "186"; }
        else { fs = "26"; yp = "184"; }
        return string.concat(
            '<text x="28" y="46" font-family="monospace" font-size="9" fill="rgba(25,25,26,0.30)" letter-spacing="2">MEGANAMES</text>'
            '<text x="200" y="', yp, '" font-family="Impact,Arial Black,Helvetica Neue,sans-serif" font-size="',
            fs, '" text-anchor="middle" fill="#1A1A1A" letter-spacing="1">', MegaNamesSVG.escapeXML(displayName), '</text>'
        );
    }

    function _svgInfo(uint256 labelLen, uint64 expiresAt, bool isSub)
        internal pure returns (string memory)
    {
        string memory left = string.concat(labelLen.toString(), labelLen == 1 ? " CHAR" : " CHARS");
        string memory center = isSub ? "SUBDOMAIN" : "";
        string memory right = (!isSub && expiresAt > 0) ? string.concat("EXP ", _fmtDate(expiresAt)) : "";

        return string.concat(
            '<rect x="16" y="336" width="368" height="36" fill="#c2c2bd" rx="0"/>'
            '<line x1="16" y1="336" x2="384" y2="336" stroke="rgba(25,25,26,0.12)" stroke-width="0.5"/>'
            '<text x="28" y="359" font-family="monospace" font-size="9" fill="rgba(25,25,26,0.40)">', left, '</text>'
            '<text x="200" y="359" font-family="monospace" font-size="9" text-anchor="middle" fill="rgba(25,25,26,0.35)" letter-spacing="2">', center, '</text>'
            '<text x="372" y="359" font-family="monospace" font-size="9" text-anchor="end" fill="rgba(25,25,26,0.35)">', right, '</text>'
        );
    }

    function _svgClose() internal pure returns (string memory) {
        return '<rect x="118" y="195" width="18" height="18" fill="rgba(25,25,26,0.04)"/>'
            '<text x="148" y="260" font-family="Helvetica Neue,Arial,sans-serif" font-size="160" font-weight="400" fill="rgba(25,25,26,0.04)">m</text>'
            '<text x="200" y="388" font-family="monospace" font-size="7" text-anchor="middle" fill="rgba(25,25,26,0.18)" letter-spacing="2">.MEGA</text>'
            '<rect x="0" y="0" width="400" height="400" fill="none" stroke="rgba(25,25,26,0.12)" stroke-width="1"/>'
            '</svg>';
    }

    /*//////////////////////////////////////////////////////////////
                          TIER COLORS
    //////////////////////////////////////////////////////////////*/

    function _tierAccent(uint8 tier) internal pure returns (string memory) {
        if (tier == 1) return "rgba(212,175,55,0.7)";
        if (tier == 2) return "rgba(192,160,45,0.55)";
        if (tier == 3) return "rgba(168,140,40,0.45)";
        if (tier == 4) return "rgba(140,130,110,0.35)";
        return "rgba(25,25,26,0.15)";
    }

    function _tierBgFill(uint8 tier) internal pure returns (string memory) {
        if (tier == 1) return "rgba(212,175,55,0.10)";
        if (tier == 2) return "rgba(192,160,45,0.07)";
        if (tier == 3) return "rgba(168,140,40,0.05)";
        if (tier == 4) return "rgba(140,130,110,0.04)";
        return "rgba(25,25,26,0.02)";
    }

    /*//////////////////////////////////////////////////////////////
                          DATE FORMAT
    //////////////////////////////////////////////////////////////*/

    function _fmtDate(uint64 ts) internal pure returns (string memory) {
        if (ts == 0) return "---";
        uint256 z = uint256(ts) / 86400 + 719468;
        uint256 era = z / 146097;
        uint256 doe = z - era * 146097;
        uint256 yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
        uint256 y = yoe + era * 400;
        uint256 doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
        uint256 mp = (5 * doy + 2) / 153;
        uint256 m = mp < 10 ? mp + 3 : mp - 9;
        if (m <= 2) y++;
        string[12] memory mn = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
        return string.concat(mn[m - 1], " ", y.toString());
    }

    /*//////////////////////////////////////////////////////////////
                          ATTRIBUTES
    //////////////////////////////////////////////////////////////*/

    function _attrs(uint256 tierLen, uint256 labelLen, uint64 expiresAt, bool isSub)
        internal pure returns (string memory)
    {
        string memory tierName;
        if (tierLen == 1) tierName = "Legendary";
        else if (tierLen == 2) tierName = "Epic";
        else if (tierLen == 3) tierName = "Rare";
        else if (tierLen == 4) tierName = "Uncommon";
        else tierName = "Standard";

        string memory a = string.concat(
            ',"attributes":[{"trait_type":"Tier","value":"', tierName,
            '"},{"trait_type":"Length","display_type":"number","value":', labelLen.toString(), '}'
        );

        if (isSub) {
            return string.concat(a, ',{"trait_type":"Type","value":"Subdomain"}]');
        }
        return string.concat(a,
            ',{"trait_type":"Expires","display_type":"date","value":', uint256(expiresAt).toString(), '}]'
        );
    }

    /*//////////////////////////////////////////////////////////////
                          HELPERS
    //////////////////////////////////////////////////////////////*/

    /// @dev Walk up the parent chain to find the root (parentless) label length
    function _rootLabelLen(uint256 tokenId) internal view returns (uint256) {
        (string memory lbl, uint256 par,,,) = megaNames.records(tokenId);
        if (par == 0) return bytes(lbl).length;
        return _rootLabelLen(par);
    }

    function _trunc(string memory s, uint256 maxLen) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        if (b.length <= maxLen) return s;
        bytes memory r = new bytes(maxLen);
        for (uint256 i; i < maxLen; i++) r[i] = b[i];
        return string(r);
    }
}
