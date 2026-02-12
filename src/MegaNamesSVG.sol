// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Base64} from "solady/utils/Base64.sol";
import {LibString} from "solady/utils/LibString.sol";

/// @title MegaNamesSVG
/// @notice SVG generation and metadata for MegaNames NFTs
library MegaNamesSVG {
    using LibString for uint256;

    function generateSVG(string memory displayName) internal pure returns (string memory) {
        return string.concat(
            _svgHeader(),
            _svgBackground(),
            _svgGeometry(),
            _svgNameText(displayName),
            _svgFooter()
        );
    }

    function _svgNameText(string memory displayName) private pure returns (string memory) {
        uint256 len = bytes(displayName).length;
        string memory fontSize;
        if (len <= 6) { fontSize = "72"; }
        else if (len <= 10) { fontSize = "48"; }
        else if (len <= 15) { fontSize = "32"; }
        else { fontSize = "24"; }

        return string.concat(
            '<text x="200" y="200" font-family="Impact,sans-serif" font-size="', fontSize,
            '" text-anchor="middle" fill="#19191a" letter-spacing="2">',
            escapeXML(displayName),
            '</text>'
        );
    }

    function _svgFooter() private pure returns (string memory) {
        return string.concat(
            '<text x="200" y="360" font-family="monospace" font-size="8" text-anchor="middle" fill="rgba(25,25,26,0.2)" letter-spacing="2">.MEGA</text>',
            '</svg>'
        );
    }

    function _svgHeader() private pure returns (string memory) {
        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">',
            '<defs>',
            '<pattern id="g" width="20" height="20" patternUnits="userSpaceOnUse">',
            '<path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(25,25,26,0.06)" stroke-width="0.5"/></pattern>',
            '</defs>'
        );
    }

    function _svgBackground() private pure returns (string memory) {
        return '<rect width="400" height="400" fill="#e8e2d6"/><rect fill="url(#g)" width="400" height="400"/>';
    }

    function _svgGeometry() private pure returns (string memory) {
        return string.concat(
            '<circle cx="200" cy="185" r="120" fill="none" stroke="#19191a0f" stroke-width=".8"/>',
            '<circle cx="200" cy="185" r="60" fill="none" stroke="#19191a14" stroke-width=".8"/>',
            '<line x1="200" y1="65" x2="200" y2="305" stroke="#19191a0d" stroke-width=".5"/>',
            '<line x1="80" y1="185" x2="320" y2="185" stroke="#19191a0d" stroke-width=".5"/>'
        );
    }

    function toUpperCase(string memory s) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        for (uint256 i = 0; i < b.length; i++) {
            if (b[i] >= 0x61 && b[i] <= 0x7A) {
                b[i] = bytes1(uint8(b[i]) - 32);
            }
        }
        return string(b);
    }

    function escapeXML(string memory s) internal pure returns (string memory) {
        bytes memory sb = bytes(s);
        bytes memory result = new bytes(sb.length * 6);
        uint256 j = 0;

        for (uint256 i = 0; i < sb.length; i++) {
            bytes1 c = sb[i];
            if (c == "&") {
                result[j++] = "&"; result[j++] = "a"; result[j++] = "m"; result[j++] = "p"; result[j++] = ";";
            } else if (c == "<") {
                result[j++] = "&"; result[j++] = "l"; result[j++] = "t"; result[j++] = ";";
            } else if (c == ">") {
                result[j++] = "&"; result[j++] = "g"; result[j++] = "t"; result[j++] = ";";
            } else {
                result[j++] = c;
            }
        }

        bytes memory trimmed = new bytes(j);
        for (uint256 i = 0; i < j; i++) {
            trimmed[i] = result[i];
        }
        return string(trimmed);
    }

    function escapeJSON(string memory s) internal pure returns (string memory) {
        bytes memory sb = bytes(s);
        bytes memory result = new bytes(sb.length * 2);
        uint256 j = 0;

        for (uint256 i = 0; i < sb.length; i++) {
            bytes1 c = sb[i];
            if (c == '"' || c == "\\") {
                result[j++] = "\\";
            }
            result[j++] = c;
        }

        bytes memory trimmed = new bytes(j);
        for (uint256 i = 0; i < j; i++) {
            trimmed[i] = result[i];
        }
        return string(trimmed);
    }

    function invalidMetadata() internal pure returns (string memory) {
        return _statusMetadata("[Invalid]", "This subdomain is no longer valid.", "[INVALID]");
    }

    function expiredMetadata() internal pure returns (string memory) {
        return _statusMetadata("[Expired]", "This name has expired.", "[EXPIRED]");
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
            Base64.encode(
                bytes(
                    string.concat('{"name":"', name, '","description":"', desc, '","image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '"}')
                )
            )
        );
    }
}
