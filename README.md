# request-filtering-agent [![Actions Status](https://github.com/azu/request-filtering-agent/workflows/ci/badge.svg)](https://github.com/azu/request-filtering-agent/actions)

An [http(s).Agent](https://nodejs.org/api/http.html#http_class_http_agent) class block the request to [Private IP addresses](https://en.wikipedia.org/wiki/Private_network) and [Reserved IP addresses](https://en.wikipedia.org/wiki/Reserved_IP_addresses).

It helps to prevent [server-side request forgery (SSRF)](https://en.wikipedia.org/wiki/Server-side_request_forgery) attack.

- [What is SSRF (Server-side request forgery)? Tutorial & Examples](https://portswigger.net/web-security/ssrf)

This library depends on [ipaddr.js](https://github.com/whitequark/ipaddr.js) definitions.
This library blocks the request to these IP addresses by default.

- [Private IPv4 addresses](https://en.wikipedia.org/wiki/Private_network#Private_IPv4_addresses)
- [Private IPv6 addresses](https://en.wikipedia.org/wiki/Private_network#Private_IPv6_addresses)
- [Link-local addresses](https://en.wikipedia.org/wiki/Private_network#Link-local_addresses)
- [Reserved IP addresses](https://en.wikipedia.org/wiki/Reserved_IP_addresses)

So, This library block the request to non-`unicast` IP addresses.

:warning: Node.js's built-in `fetch` does not support `http.Agent`.

- [Support nodejs/undici · Issue #23 · azu/request-filtering-agent](https://github.com/azu/request-filtering-agent/issues/23)

## Support `http.Agent` libraries

This library provides Node.js's [http.Agent](https://nodejs.org/api/http.html#http_class_http_agent) implementation.
[http.Agent](https://nodejs.org/api/http.html#http_class_http_agent) is supported by popular library.

- Node.js's built-in `http` and `https`
- [node-fetch](https://github.com/bitinn/node-fetch)
- [node-http-proxy](https://github.com/http-party/node-http-proxy)
- [axios](https://github.com/axios/axios)
- [got](https://github.com/sindresorhus/got)
- [@cypress/request](https://github.com/cypress-io/request)
  - :memo: [Request](https://github.com/request/request) is deprecated and it has SSRF issue
  - [CVE-2023-28155 Request allows a bypass of SSRF mitigations via an attacker-controller server that does a cross-protocol redirect · Issue #3442 · request/request](https://github.com/request/request/issues/3442)
  - [Server-Side Request Forgery in Request · CVE-2023-28155 · GitHub Advisory Database](https://github.com/advisories/GHSA-p8p7-x288-28g6)


`request-filtering-agent` works with these libraries!

## Install

Install with [npm](https://www.npmjs.com/):

    npm install request-filtering-agent

### Support Node.js version

| Version | Node.js 12 | Node.js 14 | Node.js 16 | Node.js 18 | Node.js 20  |
| :------ | :--------- | :--------- | :--------- | :--------- | :---------- |
| v1.x.x  | Support    | Support    | Support    | Support    | Not Support |
| v2.0.0  | No Support | No Support | No Support | Support    | Support     |

## Usage

`useAgent(url, options)` return an agent for the url.

The agent blocks the request to [Private network](https://en.wikipedia.org/wiki/Private_network) and [Reserved IP addresses](https://en.wikipedia.org/wiki/Reserved_IP_addresses) by default.

```js
const fetch = require("node-fetch");
const { useAgent } = require("request-filtering-agent");
const url = 'http://127.0.0.1:8080/';
fetch(url, {
    // use http or https agent for url
    agent: useAgent(url)
}).catch(err => {
    console.err(err); // DNS lookup 127.0.0.1(family:4, host:127.0.0.1.nip.io) is not allowed. Because, It is private IP address.
});
```

`request-filtering-agent` support loopback domain like [nip.io](http://nip.io).
This library detects the IP address that is dns lookup-ed.

```
$ dig 127.0.0.1.nip.io

;127.0.0.1.nip.io.		IN	A

;; ANSWER SECTION:
127.0.0.1.nip.io.	300	IN	A	127.0.0.1
```

Example code:

```js
const fetch = require("node-fetch");
const { useAgent } = require("request-filtering-agent");
const url = 'http://127.0.0.1.nip.io:8080/';
fetch(url, {
    agent: useAgent(url) // use http or https agent for url
}).catch(err => {
    console.err(err); // DNS lookup 127.0.0.1(family:4, host:127.0.0.1.nip.io) is not allowed. Because, It is private IP address.
});
```

It will prevent [DNS rebinding](https://en.wikipedia.org/wiki/DNS_rebinding)

## API

```ts
export interface RequestFilteringAgentOptions {
    // Allow to connect private IP address
    // This includes Private IP addresses and Reserved IP addresses.
    // https://en.wikipedia.org/wiki/Private_network
    // https://en.wikipedia.org/wiki/Reserved_IP_addresses
    // Example, http://127.0.0.1/, http://localhost/, https://169.254.169.254/
    // Default: false
    allowPrivateIPAddress?: boolean;
    // Allow to connect meta address 0.0.0.0
    // 0.0.0.0 (IPv4) and :: (IPv6) a meta address that routing another address
    // https://en.wikipedia.org/wiki/Reserved_IP_addresses
    // https://tools.ietf.org/html/rfc6890
    // Default: false
    allowMetaIPAddress?: boolean;
    // Allow address list
    // Supports both individual IP addresses and CIDR notation (e.g., "192.168.1.0/24", "10.0.0.0/8")
    // These values are preferred than denyAddressList
    // Default: []
    allowIPAddressList?: string[];
    // Deny address list
    // Supports both individual IP addresses and CIDR notation (e.g., "172.16.0.0/12", "2001:db8::/32")
    // Default: []
    denyIPAddressList?: string[];
}
/**
 * A subclass of http.Agent with request filtering
 */
export declare class RequestFilteringHttpAgent extends http.Agent {
    constructor(options?: http.AgentOptions & RequestFilteringAgentOptions);
}
/**
 * A subclass of https.Agent with request filtering
 */
export declare class RequestFilteringHttpsAgent extends https.Agent {
    constructor(options?: https.AgentOptions & RequestFilteringAgentOptions);
}
export declare const globalHttpAgent: RequestFilteringHttpAgent;
export declare const globalHttpsAgent: RequestFilteringHttpsAgent;
/**
 * Get an agent for the url
 * return http or https agent
 * @param url
 */
export declare const useAgent: (url: string, options?: https.AgentOptions & RequestFilteringAgentOptions) => RequestFilteringHttpAgent | RequestFilteringHttpsAgent;
```

### Example: Create an Agent with options

An agent that allow requesting specific IP addresses or CIDR ranges, but disallows other Private IPs.

```js
const fetch = require("node-fetch");
const { RequestFilteringHttpAgent } = require("request-filtering-agent");

// Create http agent with mixed individual IPs and CIDR notation
const agent = new RequestFilteringHttpAgent({
    allowIPAddressList: [
        "127.0.0.1",         // Allow localhost (individual IP)
        "192.168.1.0/24",    // Allow entire 192.168.1.x subnet (CIDR)
        "10.0.0.0/8"         // Allow entire 10.x.x.x range (CIDR)
    ],
    allowPrivateIPAddress: false, // Default: false
});

// 127.0.0.1 is allowed (individual IP match)
fetch('http://127.0.0.1:8080/', { agent }).then(res => {
    console.log(res); // OK
});

// 192.168.1.50 is allowed (matches 192.168.1.0/24 CIDR)
fetch('http://192.168.1.50:8080/', { agent }).then(res => {
    console.log(res); // OK
});

// You can also use CIDR notation in deny lists
const denyAgent = new RequestFilteringHttpAgent({
    allowPrivateIPAddress: true,     // Allow private IPs in general
    denyIPAddressList: [
        "169.254.0.0/16",           // But deny link-local addresses
        "192.168.100.0/24"          // Deny specific subnet
    ]
});
```

## Related

- [welefen/ssrf-agent: make http(s) request to prevent SSRF](https://github.com/welefen/ssrf-agent)
    - It provides only high level wrapper
    - It only handles Private IP address that is definition in [node-ip](https://github.com/indutny/node-ip/blob/43e442366bf5a93493c8c4c36736f87d675b0c3d/lib/ip.js#L302-L314)
        - Missing Meta IP Address like `0.0.0.0`

## Changelog

See [Releases page](https://github.com/azu/request-filtering-agent/releases).

## Running tests

Install devDependencies and Run `yarn test`:

    yarn test

:memo: This testing require IPv6 supports:

- Travis CI: NG 
- GitHub Actions: OK

## Contributing

Pull requests and stars are always welcome.

For bugs and feature requests, [please create an issue](https://github.com/azu/request-filtering-agent/issues).

For security issue, please see [SECURITY.md](./SECURITY.md)

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## Author

- [github/azu](https://github.com/azu)
- [twitter/azu_re](https://twitter.com/azu_re)

## License

MIT © azu
