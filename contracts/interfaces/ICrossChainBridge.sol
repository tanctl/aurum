// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

/// @title ICrossChainBridge
/// @notice Placeholder interface for future cross-chain settlement phase
/// @dev Avail Nexus relayers will call this interface with payment attestations
///      once settlement flows are implemented in a future milestone.
interface ICrossChainBridge {
    /// @notice Receive a verified payment attestation from Avail Nexus
    /// @param sourceChainId The chain where the attested payment originated
    /// @param subscriptionId The subscription identifier (bytes32)
    /// @param paymentNumber The sequential payment number for the subscription
    /// @param attestationId The Nexus attestation identifier proving payment occurred
    ///
    /// @dev Phase 1 records attestations only. Settlement logic will be added in Phase 2.
    function receivePaymentAttestation(
        uint64 sourceChainId,
        bytes32 subscriptionId,
        uint64 paymentNumber,
        bytes32 attestationId
    ) external;
}
