import { afterAll, afterEach } from "vitest";
import { failOnBlockedRequests, installNetworkGuard } from "./networkGuard";

// A vitest setup file (vite.config.ts): runs before every spec file.
installNetworkGuard();

// Throwing from afterEach fails the test that just ran. afterAll catches a
// request sent after the file's last test has finished.
afterEach(failOnBlockedRequests);
afterAll(failOnBlockedRequests);
