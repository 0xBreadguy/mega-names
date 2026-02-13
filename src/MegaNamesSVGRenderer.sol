// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Base64} from "solady/utils/Base64.sol";
import {LibString} from "solady/utils/LibString.sol";

interface IMegaNames {
    function records(uint256 tokenId) external view returns (
        string memory label,
        uint256 parent,
        uint64 expiresAt,
        uint64 epoch,
        uint64 parentEpoch
    );
    function ownerOf(uint256 tokenId) external view returns (address);
}

/// @title MegaNamesSVGRenderer
/// @notice External tokenURI renderer with dynamic expiry data
contract MegaNamesSVGRenderer {
    using LibString for uint256;

    IMegaNames public immutable megaNames;

    constructor(address _megaNames) {
        megaNames = IMegaNames(_megaNames);
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        (string memory label, uint256 parent, uint64 expiresAt,,uint64 parentEpoch) = megaNames.records(tokenId);

        if (bytes(label).length == 0) revert("Token does not exist");

        // Build full name
        string memory fullName;
        bool isSubdomain = parent != 0;
        if (isSubdomain) {
            (string memory parentLabel,,,,) = megaNames.records(parent);
            // Check stale
            (,,, uint64 parentEpoch2,) = megaNames.records(parent);
            if (parentEpoch != parentEpoch2) {
                return _statusMetadata("[Invalid]", "This subdomain is no longer valid.", "[INVALID]");
            }
            fullName = string.concat(label, ".", parentLabel, ".mega");
        } else {
            if (expiresAt < block.timestamp) {
                return _statusMetadata("[Expired]", "This name has expired.", "[EXPIRED]");
            }
            fullName = string.concat(label, ".mega");
        }

        string memory displayName = bytes(fullName).length <= 20
            ? _toUpperCase(fullName)
            : _toUpperCase(string.concat(_truncate(fullName, 17), "..."));

        string memory attributes;
        if (!isSubdomain) {
            attributes = string.concat(
                ',"attributes":[{"trait_type":"Expires","display_type":"date","value":',
                uint256(expiresAt).toString(), "}]"
            );
        } else {
            attributes = ',"attributes":[{"trait_type":"Type","value":"Subdomain"}]';
        }

        return _buildJSON(fullName, displayName, attributes, expiresAt, isSubdomain);
    }

    function _buildJSON(
        string memory fullName,
        string memory displayName,
        string memory attributes,
        uint64 expiresAt,
        bool isSubdomain
    ) private view returns (string memory) {
        string memory escaped = _escapeJSON(fullName);
        string memory svg = _generateSVG(displayName, expiresAt, isSubdomain);

        return string.concat(
            "data:application/json;base64,",
            Base64.encode(bytes(string.concat(
                '{"name":"', escaped,
                '","description":"MegaNames: ', escaped,
                '","image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)),
                '"', attributes, "}"
            )))
        );
    }

    // ── SVG Generation ──

    function _generateSVG(string memory displayName, uint64 expiresAt, bool isSubdomain) private view returns (string memory) {
        string memory top = string.concat(
            _svgHeader(), _svgBackground(), _svgRings(), _svgLines()
        );
        string memory mid = string.concat(
            _svgDots(), _svgLabels(), _svgNameText(displayName)
        );
        string memory bottom = isSubdomain
            ? string.concat(_svgSubdomainBadge(), _svgClose())
            : string.concat(_svgExpiryPanel(expiresAt), _svgClose());

        return string.concat(top, mid, bottom);
    }

    function _svgHeader() private pure returns (string memory) {
        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">',
            '<defs>',
            '<pattern id="g" width="20" height="20" patternUnits="userSpaceOnUse">',
            '<path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(25,25,26,0.06)" stroke-width="0.5"/></pattern>',
            '<pattern id="G" width="80" height="80" patternUnits="userSpaceOnUse">',
            '<path d="M 80 0 L 0 0 0 80" fill="none" stroke="rgba(25,25,26,0.10)" stroke-width="0.8"/></pattern>',
            '</defs>'
        );
    }

    function _svgBackground() private pure returns (string memory) {
        return '<rect width="400" height="400" fill="#e8e2d6"/><rect width="400" height="400" fill="url(#g)"/><rect width="400" height="400" fill="url(#G)"/>';
    }

    function _svgRings() private pure returns (string memory) {
        return string.concat(
            '<circle cx="200" cy="175" r="120" fill="none" stroke="rgba(25,25,26,0.06)" stroke-width="0.8"/>',
            '<circle cx="200" cy="175" r="85" fill="none" stroke="rgba(25,25,26,0.08)" stroke-width="0.8"/>',
            '<circle cx="200" cy="175" r="50" fill="none" stroke="rgba(25,25,26,0.10)" stroke-width="0.8"/>'
        );
    }

    function _svgLines() private pure returns (string memory) {
        return string.concat(
            '<line x1="200" y1="55" x2="200" y2="295" stroke="rgba(25,25,26,0.05)" stroke-width="0.5"/>',
            '<line x1="80" y1="175" x2="320" y2="175" stroke="rgba(25,25,26,0.05)" stroke-width="0.5"/>',
            '<line x1="0" y1="0" x2="120" y2="120" stroke="rgba(25,25,26,0.04)" stroke-width="0.5"/>',
            '<line x1="400" y1="0" x2="280" y2="120" stroke="rgba(25,25,26,0.04)" stroke-width="0.5"/>',
            '<path d="M 16 16 L 16 32 M 16 16 L 32 16" fill="none" stroke="rgba(25,25,26,0.15)" stroke-width="1"/>',
            '<path d="M 384 16 L 384 32 M 384 16 L 368 16" fill="none" stroke="rgba(25,25,26,0.15)" stroke-width="1"/>',
            '<path d="M 16 384 L 16 368 M 16 384 L 32 384" fill="none" stroke="rgba(25,25,26,0.15)" stroke-width="1"/>',
            '<path d="M 384 384 L 384 368 M 384 384 L 368 384" fill="none" stroke="rgba(25,25,26,0.15)" stroke-width="1"/>'
        );
    }

    function _svgDots() private pure returns (string memory) {
        return string.concat(
            '<circle cx="200" cy="55" r="3" fill="rgba(25,25,26,0.12)"/>',
            '<circle cx="320" cy="175" r="3" fill="rgba(25,25,26,0.12)"/>',
            '<circle cx="200" cy="295" r="3" fill="rgba(25,25,26,0.12)"/>',
            '<circle cx="80" cy="175" r="3" fill="rgba(25,25,26,0.12)"/>',
            '<circle cx="262" cy="102" r="2.5" fill="none" stroke="rgba(25,25,26,0.10)" stroke-width="1"/>',
            '<circle cx="138" cy="248" r="2.5" fill="none" stroke="rgba(25,25,26,0.10)" stroke-width="1"/>'
        );
    }

    function _svgLabels() private pure returns (string memory) {
        return '<text x="200" y="46" font-family="monospace" font-size="8" text-anchor="middle" fill="rgba(25,25,26,0.25)" letter-spacing="3">MEGANAMES</text>';
    }

    function _svgNameText(string memory displayName) private pure returns (string memory) {
        uint256 len = bytes(displayName).length;
        string memory fontSize;
        string memory yPos;
        if (len <= 6) { fontSize = "80"; yPos = "195"; }
        else if (len <= 10) { fontSize = "52"; yPos = "190"; }
        else if (len <= 15) { fontSize = "36"; yPos = "188"; }
        else { fontSize = "28"; yPos = "186"; }

        return string.concat(
            '<text x="200" y="', yPos,
            '" font-family="Impact,Arial Black,Helvetica Neue,sans-serif" font-size="', fontSize,
            '" text-anchor="middle" fill="#19191a" letter-spacing="2">',
            _escapeXML(displayName), '</text>'
        );
    }

    function _svgSubdomainBadge() private pure returns (string memory) {
        return string.concat(
            '<rect x="150" y="310" width="100" height="20" rx="10" fill="none" stroke="rgba(25,25,26,0.20)" stroke-width="0.8"/>',
            '<text x="200" y="323" font-family="monospace" font-size="8" text-anchor="middle" fill="rgba(25,25,26,0.35)" letter-spacing="2">SUBDOMAIN</text>'
        );
    }

    function _svgExpiryPanel(uint64 expiresAt) private view returns (string memory) {
        return string.concat(
            '<line x1="40" y1="300" x2="360" y2="300" stroke="rgba(25,25,26,0.10)" stroke-width="0.5"/>',
            _svgArc(expiresAt),
            _svgExpiryDate(expiresAt),
            _svgRemaining(expiresAt)
        );
    }

    function _svgArc(uint64 expiresAt) private view returns (string memory) {
        uint256 expires = uint256(expiresAt);
        if (block.timestamp >= expires) {
            return '<circle cx="60" cy="340" r="18" fill="none" stroke="rgba(180,60,60,0.15)" stroke-width="2"/>';
        }
        uint256 remaining = expires - block.timestamp;
        // Assume max 10 year registration for percentage calc
        uint256 maxDuration = 10 * 365 days;
        uint256 pct = remaining > maxDuration ? 100 : (remaining * 100) / maxDuration;
        uint256 filled = 113 * pct / 100;

        return string.concat(
            '<circle cx="60" cy="340" r="18" fill="none" stroke="rgba(25,25,26,0.06)" stroke-width="2"/>',
            '<circle cx="60" cy="340" r="18" fill="none" stroke="rgba(25,25,26,0.30)" stroke-width="2" stroke-dasharray="',
            filled.toString(), ' ', (113 - filled).toString(),
            '" stroke-dashoffset="28" stroke-linecap="round" transform="rotate(-90 60 340)"/>',
            '<text x="60" y="344" font-family="Impact,Arial Black,sans-serif" font-size="11" text-anchor="middle" fill="rgba(25,25,26,0.40)">', pct.toString(), '%</text>'
        );
    }

    function _svgExpiryDate(uint64 expiresAt) private pure returns (string memory) {
        return string.concat(
            '<text x="200" y="330" font-family="monospace" font-size="7" text-anchor="middle" fill="rgba(25,25,26,0.30)" letter-spacing="2">EXPIRES</text>',
            '<text x="200" y="348" font-family="monospace" font-size="10" text-anchor="middle" fill="rgba(25,25,26,0.50)" letter-spacing="1">', _formatDate(expiresAt), '</text>'
        );
    }

    function _svgRemaining(uint64 expiresAt) private view returns (string memory) {
        if (block.timestamp >= uint256(expiresAt)) {
            return string.concat(
                '<text x="340" y="330" font-family="monospace" font-size="7" text-anchor="middle" fill="rgba(25,25,26,0.30)" letter-spacing="2">REMAINING</text>',
                '<text x="340" y="348" font-family="Impact,Arial Black,sans-serif" font-size="14" text-anchor="middle" fill="rgba(180,60,60,0.6)" letter-spacing="1">EXPIRED</text>'
            );
        }
        return string.concat(
            '<text x="340" y="330" font-family="monospace" font-size="7" text-anchor="middle" fill="rgba(25,25,26,0.30)" letter-spacing="2">REMAINING</text>',
            '<text x="340" y="348" font-family="Impact,Arial Black,sans-serif" font-size="14" text-anchor="middle" fill="rgba(25,25,26,0.50)" letter-spacing="1">', _formatRemaining(expiresAt), '</text>'
        );
    }

    function _formatRemaining(uint64 expiresAt) private view returns (string memory) {
        uint256 remaining = uint256(expiresAt) - block.timestamp;
        uint256 days_ = remaining / 86400;
        if (days_ >= 365) {
            uint256 years_ = days_ / 365;
            uint256 months_ = (days_ % 365) / 30;
            return months_ > 0
                ? string.concat(years_.toString(), "Y ", months_.toString(), "M")
                : string.concat(years_.toString(), "Y");
        }
        if (days_ > 0) return string.concat(days_.toString(), "D");
        return string.concat((remaining / 3600).toString(), "H");
    }

    function _svgClose() private pure returns (string memory) {
        return string.concat(
            '<text x="200" y="215" font-family="Impact,Arial Black,sans-serif" font-size="200" text-anchor="middle" fill="rgba(25,25,26,0.02)">M</text>',
            '<text x="200" y="380" font-family="monospace" font-size="8" text-anchor="middle" fill="rgba(25,25,26,0.20)" letter-spacing="2">.MEGA</text>',
            '<rect x="8" y="8" width="384" height="384" fill="none" stroke="rgba(25,25,26,0.10)" stroke-width="0.5"/>',
            '</svg>'
        );
    }

    // ── Date Formatting ──

    function _formatDate(uint64 timestamp) private pure returns (string memory) {
        (uint256 year, uint256 month, uint256 day) = _daysToDate(uint256(timestamp) / 86400);
        string[12] memory months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        return string.concat(months[month - 1], " ", day.toString(), ", ", year.toString());
    }

    function _daysToDate(uint256 _days) private pure returns (uint256 year, uint256 month, uint256 day) {
        int256 d = int256(_days);
        int256 L = d + 68569 + 2440588;
        int256 N = (4 * L) / 146097;
        L = L - (146097 * N + 3) / 4;
        int256 y = (4000 * (L + 1)) / 1461001;
        L = L - (1461 * y) / 4 + 31;
        int256 m = (80 * L) / 2447;
        int256 dd = L - (2447 * m) / 80;
        L = m / 11;
        m = m + 2 - 12 * L;
        y = 100 * (N - 49) + y + L;
        year = uint256(y);
        month = uint256(m);
        day = uint256(dd);
    }

    // ── String Utils ──

    function _toUpperCase(string memory s) private pure returns (string memory) {
        bytes memory b = bytes(s);
        for (uint256 i = 0; i < b.length; i++) {
            if (b[i] >= 0x61 && b[i] <= 0x7A) b[i] = bytes1(uint8(b[i]) - 32);
        }
        return string(b);
    }

    function _truncate(string memory s, uint256 maxLen) private pure returns (string memory) {
        bytes memory b = bytes(s);
        if (b.length <= maxLen) return s;
        bytes memory result = new bytes(maxLen);
        for (uint256 i = 0; i < maxLen; i++) result[i] = b[i];
        return string(result);
    }

    function _escapeXML(string memory s) private pure returns (string memory) {
        bytes memory sb = bytes(s);
        bytes memory result = new bytes(sb.length * 6);
        uint256 j;
        for (uint256 i; i < sb.length; i++) {
            if (sb[i] == "&") { result[j++]="&"; result[j++]="a"; result[j++]="m"; result[j++]="p"; result[j++]=";"; }
            else if (sb[i] == "<") { result[j++]="&"; result[j++]="l"; result[j++]="t"; result[j++]=";"; }
            else if (sb[i] == ">") { result[j++]="&"; result[j++]="g"; result[j++]="t"; result[j++]=";"; }
            else result[j++] = sb[i];
        }
        bytes memory trimmed = new bytes(j);
        for (uint256 i; i < j; i++) trimmed[i] = result[i];
        return string(trimmed);
    }

    function _escapeJSON(string memory s) private pure returns (string memory) {
        bytes memory sb = bytes(s);
        bytes memory result = new bytes(sb.length * 2);
        uint256 j;
        for (uint256 i; i < sb.length; i++) {
            if (sb[i] == '"' || sb[i] == "\\") result[j++] = "\\";
            result[j++] = sb[i];
        }
        bytes memory trimmed = new bytes(j);
        for (uint256 i; i < j; i++) trimmed[i] = result[i];
        return string(trimmed);
    }

    function _statusMetadata(string memory name, string memory desc, string memory label) private pure returns (string memory) {
        string memory svg = string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">',
            '<rect width="400" height="400" fill="#d4d0c8"/>',
            '<text x="200" y="196" font-family="Impact,Arial Black,sans-serif" font-size="36" text-anchor="middle" fill="rgba(25,25,26,0.20)" letter-spacing="2">', label, '</text>',
            '<text x="200" y="360" font-family="monospace" font-size="8" text-anchor="middle" fill="rgba(25,25,26,0.12)" letter-spacing="2">.MEGA</text>',
            '</svg>'
        );
        return string.concat(
            "data:application/json;base64,",
            Base64.encode(bytes(string.concat(
                '{"name":"', name, '","description":"', desc,
                '","image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '"}'
            )))
        );
    }
}
