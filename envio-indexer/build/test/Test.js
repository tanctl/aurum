"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const generated_1 = require("generated");
const { MockDb, RelayerRegistry } = generated_1.TestHelpers;
describe("RelayerRegistry contract EmergencySlash event tests", () => {
    // Create mock db
    const mockDb = MockDb.createMockDb();
    // Creating mock for RelayerRegistry contract EmergencySlash event
    const event = RelayerRegistry.EmergencySlash.createMockEvent({ /* It mocks event fields with default values. You can overwrite them if you need */});
    it("RelayerRegistry_EmergencySlash is created correctly", async () => {
        // Processing the event
        const mockDbUpdated = await RelayerRegistry.EmergencySlash.processEvent({
            event,
            mockDb,
        });
        // Getting the actual entity from the mock database
        let actualRelayerRegistryEmergencySlash = mockDbUpdated.entities.RelayerRegistry_EmergencySlash.get(`${event.chainId}_${event.block.number}_${event.logIndex}`);
        // Creating the expected entity
        const expectedRelayerRegistryEmergencySlash = {
            id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
            relayer: event.params.relayer,
            amount: event.params.amount,
            reason: event.params.reason,
        };
        // Asserting that the entity in the mock database is the same as the expected entity
        assert_1.default.deepEqual(actualRelayerRegistryEmergencySlash, expectedRelayerRegistryEmergencySlash, "Actual RelayerRegistryEmergencySlash should be the same as the expectedRelayerRegistryEmergencySlash");
    });
});
