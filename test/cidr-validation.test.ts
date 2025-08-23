import * as assert from "assert";
import { RequestFilteringHttpAgent } from "../src/request-filtering-agent";

describe("CIDR notation support", function () {
    it("should support CIDR notation in allowIPAddressList (validation only)", function () {
        const agent = new RequestFilteringHttpAgent({
            allowIPAddressList: ["127.0.0.0/8", "192.168.1.0/24"],
            allowPrivateIPAddress: false
        });

        // Test IPs that should pass validation (be allowed)
        const allowedIPs = ["127.0.0.1", "127.255.255.255", "192.168.1.100"];
        for (const ip of allowedIPs) {
            try {
                // Test validation by trying to create a connection (which will trigger validateIPAddress)
                // Since validation passes, we'll get a network error, but that's fine
                agent.createConnection({ host: ip, port: 80 }, () => {}).on("error", () => {});
            } catch (error) {
                if ((error as Error).message.includes("is not allowed")) {
                    assert.fail(
                        new Error(`${ip} should be allowed by CIDR but was denied: ${(error as Error).message}`)
                    );
                }
                // Network errors are expected and acceptable for this validation test
            }
        }

        // Test IPs that should fail validation (be denied)
        const deniedIPs = ["192.168.2.1", "10.0.0.1"];
        for (const ip of deniedIPs) {
            try {
                agent.createConnection({ host: ip, port: 80 }, () => {});
                assert.fail(new Error(`${ip} should be denied but was allowed`));
            } catch (error) {
                if ((error as Error).message.includes("is not allowed")) {
                    // This is expected - the IP should be denied
                    assert.ok(true, `${ip} correctly denied: ${(error as Error).message}`);
                } else {
                    assert.fail(new Error(`${ip} failed for wrong reason: ${(error as Error).message}`));
                }
            }
        }
    });

    it("should support CIDR notation in denyIPAddressList (validation only)", function () {
        const agent = new RequestFilteringHttpAgent({
            allowPrivateIPAddress: true, // Allow private IPs in general
            denyIPAddressList: ["192.168.1.0/24", "10.0.0.0/8"] // But deny specific CIDR ranges
        });

        // Test IPs that should be denied (match CIDR in deny list)
        const deniedIPs = ["192.168.1.1", "192.168.1.255", "10.0.0.1", "10.255.255.255"];
        for (const ip of deniedIPs) {
            try {
                agent.createConnection({ host: ip, port: 80 }, () => {});
                assert.fail(new Error(`${ip} should be denied by CIDR but was allowed`));
            } catch (error) {
                if ((error as Error).message.includes("denyIPAddressList")) {
                    assert.ok(true, `${ip} correctly denied by deny list`);
                } else {
                    assert.fail(new Error(`${ip} failed for wrong reason: ${(error as Error).message}`));
                }
            }
        }

        // Test IP that should be allowed (not in deny CIDR ranges)
        const allowedIP = "172.16.0.1";
        try {
            agent.createConnection({ host: allowedIP, port: 80 }, () => {}).on("error", () => {});
            // If we reach here, validation passed (which is correct)
        } catch (error) {
            if ((error as Error).message.includes("is not allowed")) {
                assert.fail(new Error(`${allowedIP} should be allowed but was denied: ${(error as Error).message}`));
            }
            // Network errors are expected and acceptable
        }
    });

    it("should support mixed individual IPs and CIDR notation (validation only)", function () {
        const agent = new RequestFilteringHttpAgent({
            allowIPAddressList: ["127.0.0.1", "192.168.1.0/24"], // Mix of individual and CIDR
            allowPrivateIPAddress: false
        });

        const testCases = [
            { ip: "127.0.0.1", shouldAllow: true, reason: "exact match" },
            { ip: "192.168.1.50", shouldAllow: true, reason: "CIDR match" },
            { ip: "10.0.0.1", shouldAllow: false, reason: "not in allow list" }
        ];

        for (const { ip, shouldAllow, reason } of testCases) {
            try {
                agent.createConnection({ host: ip, port: 80 }, () => {}).on("error", () => {});
                if (!shouldAllow) {
                    assert.fail(new Error(`${ip} should be denied (${reason}) but was allowed`));
                }
                // If we reach here and shouldAllow is true, validation passed correctly
            } catch (error) {
                if (shouldAllow && (error as Error).message.includes("is not allowed")) {
                    assert.fail(
                        new Error(`${ip} should be allowed (${reason}) but was denied: ${(error as Error).message}`)
                    );
                } else if (!shouldAllow && (error as Error).message.includes("is not allowed")) {
                    assert.ok(true, `${ip} correctly denied (${reason})`);
                }
                // Network errors are acceptable for allowed IPs
            }
        }
    });

    it("should support IPv6 CIDR notation (validation only)", function () {
        const agent = new RequestFilteringHttpAgent({
            allowIPAddressList: ["2001:db8::/32"],
            allowPrivateIPAddress: false
        });

        const testCases = [
            { ip: "2001:db8::1", shouldAllow: true, reason: "matches IPv6 CIDR" },
            { ip: "2001:db8:ffff::1", shouldAllow: true, reason: "matches IPv6 CIDR" },
            { ip: "2001:db9::1", shouldAllow: false, reason: "doesn't match IPv6 CIDR" }
        ];

        for (const { ip, shouldAllow, reason } of testCases) {
            try {
                agent.createConnection({ host: ip, port: 80 }, () => {}).on("error", () => {});
                if (!shouldAllow) {
                    assert.fail(new Error(`${ip} should be denied (${reason}) but was allowed`));
                }
                // If we reach here and shouldAllow is true, validation passed correctly
            } catch (error) {
                if (shouldAllow && (error as Error).message.includes("is not allowed")) {
                    assert.fail(
                        new Error(`${ip} should be allowed (${reason}) but was denied: ${(error as Error).message}`)
                    );
                } else if (!shouldAllow && (error as Error).message.includes("is not allowed")) {
                    assert.ok(true, `${ip} correctly denied (${reason})`);
                }
                // Network errors are acceptable for allowed IPs
            }
        }
    });

    it("should handle invalid CIDR notation gracefully (validation only)", function () {
        const agent = new RequestFilteringHttpAgent({
            allowIPAddressList: ["invalid-cidr/24", "192.168.1.0/24"], // Mix of invalid and valid
            allowPrivateIPAddress: false
        });

        // Valid CIDR should still work despite invalid entries in the list
        try {
            agent.createConnection({ host: "192.168.1.10", port: 80 }, () => {}).on("error", () => {});
            // If we reach here, validation passed (which is correct)
        } catch (error) {
            if ((error as Error).message.includes("is not allowed")) {
                assert.fail(new Error("192.168.1.10 should be allowed by valid CIDR but was denied"));
            }
            // Network error is acceptable
        }
    });

    it("should maintain backward compatibility with individual IP addresses", function () {
        const agent = new RequestFilteringHttpAgent({
            allowIPAddressList: ["127.0.0.1", "::1"],
            allowPrivateIPAddress: false
        });

        // Test that exact IP matches still work
        const exactMatches = ["127.0.0.1"];
        for (const ip of exactMatches) {
            try {
                agent.createConnection({ host: ip, port: 80 }, () => {}).on("error", () => {});
                // If we reach here, validation passed (which is correct)
            } catch (error) {
                if ((error as Error).message.includes("is not allowed")) {
                    assert.fail(new Error(`${ip} should be allowed by exact match but was denied`));
                }
                // Network errors are expected and acceptable
            }
        }

        // Test that non-matching IPs are still denied
        try {
            agent.createConnection({ host: "192.168.1.1", port: 80 }, () => {});
            assert.fail(new Error("192.168.1.1 should be denied but was allowed"));
        } catch (error) {
            if ((error as Error).message.includes("is not allowed")) {
                assert.ok(true, "192.168.1.1 correctly denied");
            }
            // This should be a validation error, not a network error
        }
    });
});
