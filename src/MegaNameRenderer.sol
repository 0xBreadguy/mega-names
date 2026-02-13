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
    function totalRegistrations() external view returns (uint256);
}

/// @title MegaNameRenderer
/// @notice External tokenURI renderer with registration #, tier graphics, subdomain count
contract MegaNameRenderer is Ownable {
    using LibString for uint256;

    IMegaNames public immutable megaNames;
    mapping(uint256 => uint256) public registrationNumber;
    mapping(uint256 => uint256) public subdomainCount;
    uint256 public nextRegistrationNumber;

    constructor(address _megaNames, uint256 _startingNumber) payable {
        _initializeOwner(tx.origin);
        megaNames = IMegaNames(_megaNames);
        nextRegistrationNumber = _startingNumber;
    }

    /*//////////////////////////////////////////////////////////////
                           ADMIN
    //////////////////////////////////////////////////////////////*/

    function batchSetRegistrationNumbers(uint256[] calldata tokenIds, uint256 startNumber) external onlyOwner {
        for (uint256 i; i < tokenIds.length; i++) {
            registrationNumber[tokenIds[i]] = startNumber + i;
        }
        uint256 end = startNumber + tokenIds.length;
        if (end > nextRegistrationNumber) nextRegistrationNumber = end;
    }

    function setRegistrationNumber(uint256 tokenId, uint256 number) external onlyOwner {
        registrationNumber[tokenId] = number;
        if (number >= nextRegistrationNumber) nextRegistrationNumber = number + 1;
    }

    function batchSetSubdomainCounts(uint256[] calldata tokenIds, uint256[] calldata counts) external onlyOwner {
        require(tokenIds.length == counts.length);
        for (uint256 i; i < tokenIds.length; i++) {
            subdomainCount[tokenIds[i]] = counts[i];
        }
    }

    function incrementSubdomainCount(uint256 parentTokenId) external onlyOwner {
        subdomainCount[parentTokenId]++;
    }

    function decrementSubdomainCount(uint256 parentTokenId) external onlyOwner {
        if (subdomainCount[parentTokenId] > 0) subdomainCount[parentTokenId]--;
    }

    function recordRegistration(uint256 tokenId) external onlyOwner {
        registrationNumber[tokenId] = nextRegistrationNumber++;
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

        return _render(tokenId, label, parent, expiresAt);
    }

    /// @dev Pack all render data into a uint array to avoid stack depth issues
    function _render(uint256 tokenId, string memory label, uint256 parent, uint64 expiresAt)
        internal view returns (string memory)
    {
        string memory fullName = _buildName(label, parent);
        string memory displayName = _makeDisplay(fullName);
        // Pack: [labelLen, regNum, subCount, totalRegs, expiresAt, isSub]
        uint256[6] memory d;
        d[0] = bytes(label).length;
        d[1] = registrationNumber[tokenId];
        d[2] = parent != 0 ? 0 : subdomainCount[tokenId];
        d[3] = megaNames.totalRegistrations();
        d[4] = uint256(expiresAt);
        d[5] = parent != 0 ? 1 : 0;
        return _encodeAll(fullName, displayName, d);
    }

    function _encodeAll(string memory fullName, string memory displayName, uint256[6] memory d)
        internal pure returns (string memory)
    {
        bool isSub = d[5] == 1;
        string memory svg = _svg(displayName, d[0], d[1], d[3], d[2], uint64(d[4]), isSub);
        return _encode(fullName, svg, d[0], d[1], d[2], uint64(d[4]), isSub);
    }

    function _buildName(string memory label, uint256 parent) internal view returns (string memory) {
        if (parent != 0) {
            (string memory pLabel,,,,) = megaNames.records(parent);
            return string.concat(label, ".", pLabel, ".mega");
        }
        return string.concat(label, ".mega");
    }

    function _makeDisplay(string memory fullName) internal pure returns (string memory) {
        if (bytes(fullName).length <= 20) return MegaNamesSVG.toUpperCase(fullName);
        return MegaNamesSVG.toUpperCase(string.concat(_trunc(fullName, 17), "..."));
    }

    function _encode(string memory fullName, string memory svg, uint256 labelLen,
        uint256 regNum, uint256 subCount, uint64 expiresAt, bool isSub)
        internal pure returns (string memory)
    {
        string memory n = MegaNamesSVG.escapeJSON(fullName);
        string memory img = Base64.encode(bytes(svg));
        string memory attr = _attrs(labelLen, regNum, subCount, expiresAt, isSub);

        return string.concat(
            "data:application/json;base64,",
            Base64.encode(bytes(string.concat(
                '{"name":"', n, '","description":"MegaNames: ', n,
                '","image":"data:image/svg+xml;base64,', img, '"', attr, '}'
            )))
        );
    }

    /*//////////////////////////////////////////////////////////////
                          SVG — synced with meganame.market aesthetic
    //////////////////////////////////////////////////////////////*/

    function _svg(string memory displayName, uint256 labelLen, uint256 regNum,
        uint256 totalRegs, uint256 subCount, uint64 expiresAt, bool isSub)
        internal pure returns (string memory)
    {
        uint8 tier = labelLen >= 5 ? 5 : uint8(labelLen);
        string memory part1 = string.concat(_svgOpen(), _svgBg(tier));
        string memory part2 = string.concat(_svgCorners(), _svgTierIcon(tier));
        string memory part3 = string.concat(_svgName(displayName), _svgInfo(regNum, totalRegs, subCount, expiresAt, isSub), _svgClose());
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
        if (tier == 1) { // LEGENDARY — diamond
            return string.concat(
                '<polygon points="360,28 370,42 360,56 350,42" fill="none" stroke="', ac, '" stroke-width="1.5"/>'
                '<polygon points="360,34 364,42 360,50 356,42" fill="', al, '"/>'
            );
        }
        if (tier == 2) { // EPIC — double diamond
            return string.concat(
                '<polygon points="352,28 358,42 352,56 346,42" fill="none" stroke="', ac, '" stroke-width="1.2"/>'
                '<polygon points="368,28 374,42 368,56 362,42" fill="none" stroke="', ac, '" stroke-width="1.2"/>'
            );
        }
        if (tier == 3) { // RARE — hexagon
            return string.concat(
                '<polygon points="360,28 372,35 372,49 360,56 348,49 348,35" fill="none" stroke="', ac, '" stroke-width="1.2"/>'
                '<circle cx="360" cy="42" r="6" fill="', al, '"/>'
            );
        }
        if (tier == 4) { // UNCOMMON — pentagon
            return string.concat(
                '<polygon points="360,28 374,39 369,55 351,55 346,39" fill="none" stroke="', ac, '" stroke-width="1"/>'
                '<circle cx="360" cy="42" r="4" fill="', al, '"/>'
            );
        }
        // STANDARD — circle
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

    function _svgInfo(uint256 regNum, uint256 totalRegs, uint256 subCount, uint64 expiresAt, bool isSub)
        internal pure returns (string memory)
    {
        string memory left = regNum > 0 ? string.concat("#", regNum.toString(), " / ", totalRegs.toString()) : "";
        string memory center = isSub ? "SUBDOMAIN" : (subCount > 0 ? string.concat(subCount.toString(), subCount == 1 ? " SUB" : " SUBS") : "");
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
        return '<text x="200" y="210" font-family="Impact,Arial Black,sans-serif" font-size="200" text-anchor="middle" fill="rgba(25,25,26,0.025)">M</text>'
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

    /// @dev "FEB 2029" — civil date from unix timestamp
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

    function _attrs(uint256 labelLen, uint256 regNum, uint256 subCount, uint64 expiresAt, bool isSub)
        internal pure returns (string memory)
    {
        string memory tierName;
        if (labelLen == 1) tierName = "Legendary";
        else if (labelLen == 2) tierName = "Epic";
        else if (labelLen == 3) tierName = "Rare";
        else if (labelLen == 4) tierName = "Uncommon";
        else tierName = "Standard";

        string memory a = string.concat(
            ',"attributes":[{"trait_type":"Tier","value":"', tierName,
            '"},{"trait_type":"Length","display_type":"number","value":', labelLen.toString(), '}'
        );

        if (regNum > 0) {
            a = string.concat(a, ',{"trait_type":"Registration #","display_type":"number","value":', regNum.toString(), '}');
        }

        if (isSub) {
            return string.concat(a, ',{"trait_type":"Type","value":"Subdomain"}]');
        }
        return string.concat(a,
            ',{"trait_type":"Subdomains","display_type":"number","value":', subCount.toString(),
            '},{"trait_type":"Expires","display_type":"date","value":', uint256(expiresAt).toString(), '}]'
        );
    }

    /*//////////////////////////////////////////////////////////////
                          HELPERS
    //////////////////////////////////////////////////////////////*/

    function _trunc(string memory s, uint256 maxLen) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        if (b.length <= maxLen) return s;
        bytes memory r = new bytes(maxLen);
        for (uint256 i; i < maxLen; i++) r[i] = b[i];
        return string(r);
    }
}
