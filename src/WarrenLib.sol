// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title WarrenLib
/// @notice Library for encoding/decoding Warren Protocol contenthash format
/// @dev Warren contenthash format (7 bytes):
///      [codec 2B] [type 1B] [tokenId 4B]
///      - Codec: 0xe9 (Warren namespace, pending multicodec registration)
///      - Type: 0x01 = Master NFT, 0x02 = Container NFT
///      - TokenId: uint32 Warren site token ID
library WarrenLib {
    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    error InvalidWarrenContenthashLength();
    error InvalidWarrenCodec();
    error InvalidWarrenType();

    /*//////////////////////////////////////////////////////////////
                                CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @dev Warren namespace codec (pending multicodec registration)
    /// If not approved, fallback to 0x300000 (private-use range)
    uint16 public constant WARREN_CODEC = 0x00e9;

    /// @dev Warren Master NFT type
    uint8 public constant TYPE_MASTER = 0x01;

    /// @dev Warren Container NFT type
    uint8 public constant TYPE_CONTAINER = 0x02;

    /// @dev Expected contenthash length for Warren format
    uint256 public constant CONTENTHASH_LENGTH = 7;

    /*//////////////////////////////////////////////////////////////
                                ENCODING
    //////////////////////////////////////////////////////////////*/

    /// @notice Encode a Warren contenthash for a Master NFT
    /// @param tokenId The Warren Master NFT token ID
    /// @return contenthash The encoded contenthash bytes
    function encodeMaster(uint32 tokenId) internal pure returns (bytes memory) {
        return encode(tokenId, true);
    }

    /// @notice Encode a Warren contenthash for a Container NFT
    /// @param tokenId The Warren Container NFT token ID
    /// @return contenthash The encoded contenthash bytes
    function encodeContainer(uint32 tokenId) internal pure returns (bytes memory) {
        return encode(tokenId, false);
    }

    /// @notice Encode a Warren contenthash
    /// @param tokenId The Warren NFT token ID
    /// @param isMaster True for Master NFT (0x01), false for Container NFT (0x02)
    /// @return contenthash The encoded contenthash bytes
    function encode(uint32 tokenId, bool isMaster) internal pure returns (bytes memory) {
        return abi.encodePacked(
            WARREN_CODEC,
            isMaster ? TYPE_MASTER : TYPE_CONTAINER,
            tokenId
        );
    }

    /*//////////////////////////////////////////////////////////////
                                DECODING
    //////////////////////////////////////////////////////////////*/

    /// @notice Decode a Warren contenthash
    /// @param contenthash The encoded contenthash bytes
    /// @return tokenId The Warren NFT token ID
    /// @return isMaster True if Master NFT, false if Container NFT
    function decode(bytes memory contenthash)
        internal
        pure
        returns (uint32 tokenId, bool isMaster)
    {
        if (contenthash.length != CONTENTHASH_LENGTH) {
            revert InvalidWarrenContenthashLength();
        }

        // Extract and validate codec (bytes 0-1)
        uint16 codec = uint16(uint8(contenthash[0])) << 8 | uint16(uint8(contenthash[1]));
        if (codec != WARREN_CODEC) {
            revert InvalidWarrenCodec();
        }

        // Extract and validate type (byte 2)
        uint8 typeFlag = uint8(contenthash[2]);
        if (typeFlag != TYPE_MASTER && typeFlag != TYPE_CONTAINER) {
            revert InvalidWarrenType();
        }
        isMaster = typeFlag == TYPE_MASTER;

        // Extract tokenId (bytes 3-6)
        tokenId = uint32(uint8(contenthash[3])) << 24
            | uint32(uint8(contenthash[4])) << 16
            | uint32(uint8(contenthash[5])) << 8
            | uint32(uint8(contenthash[6]));
    }

    /*//////////////////////////////////////////////////////////////
                               VALIDATION
    //////////////////////////////////////////////////////////////*/

    /// @notice Check if contenthash is a valid Warren reference
    /// @param contenthash The contenthash to validate
    /// @return True if valid Warren contenthash
    function isWarren(bytes memory contenthash) internal pure returns (bool) {
        if (contenthash.length != CONTENTHASH_LENGTH) return false;

        // Check Warren codec
        uint16 codec = uint16(uint8(contenthash[0])) << 8 | uint16(uint8(contenthash[1]));
        if (codec != WARREN_CODEC) return false;

        // Check valid type
        uint8 typeFlag = uint8(contenthash[2]);
        if (typeFlag != TYPE_MASTER && typeFlag != TYPE_CONTAINER) return false;

        return true;
    }

    /// @notice Extract just the Warren token ID without full validation
    /// @param contenthash The contenthash bytes
    /// @return tokenId The Warren NFT token ID (0 if invalid)
    function getTokenId(bytes memory contenthash) internal pure returns (uint32) {
        if (!isWarren(contenthash)) return 0;
        
        return uint32(uint8(contenthash[3])) << 24
            | uint32(uint8(contenthash[4])) << 16
            | uint32(uint8(contenthash[5])) << 8
            | uint32(uint8(contenthash[6]));
    }

    /// @notice Check if contenthash points to a Master NFT
    /// @param contenthash The contenthash bytes
    /// @return True if Master NFT type
    function isMasterType(bytes memory contenthash) internal pure returns (bool) {
        if (!isWarren(contenthash)) return false;
        return uint8(contenthash[2]) == TYPE_MASTER;
    }

    /// @notice Check if contenthash points to a Container NFT
    /// @param contenthash The contenthash bytes
    /// @return True if Container NFT type
    function isContainerType(bytes memory contenthash) internal pure returns (bool) {
        if (!isWarren(contenthash)) return false;
        return uint8(contenthash[2]) == TYPE_CONTAINER;
    }
}
