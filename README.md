# Oddworks Tinypass Provider

A Tinypass provider plugin for the Oddworks content server.

[![Build Status](https://travis-ci.org/oddnetworks/oddworks-tinypass-provider.svg?branch=master)](https://travis-ci.org/oddnetworks/oddworks-tinypass-provider)

Installation
------------
Install the npm package as a Node.js library:

    npm install --save oddworks-tinypass-provider

For full Tinypass API documentation see [developer.tinypass.com/api](https://developer.tinypass.com/api).

Oddworks Server Integration
---------------------------
The Oddworks-Tinypass provider is designed to be integrated with an Oddworks server [identity](https://github.com/oddnetworks/oddworks/tree/master/lib/services/identity), specifically as a [provider](https://github.com/oddnetworks/oddworks/tree/master/lib/services/identity#providers). To initialize the plugin in your server:

```JavaScript
const tinypassProvider = require('oddworks-tinypass-provider');

// See https://github.com/oddnetworks/oddworks/tree/master/lib/services/catalog#patterns
// for more information regarding an Oddcast Bus.
const bus = createMyOddcastBus();

const options = {
    bus: bus,
    apiToken: process.env.TINYPASS_API_TOKEN,
    applicationID: process.env.TINYPASS_APPLICATION_ID,
    sandbox: true
};

tinypassProvider.initialize(options).then(provider => {
    console.log('Initialized provider "%s"', provider.name);
}).catch(err => {
    console.error(err.stack || err.message || err);
});
```

The initialization process will attach Oddcast listeners for the following queries:

- `bus.query({role: 'provider', cmd: 'get', source: 'tinypass-viewer'})`

To use them you send Oddcast commands to save a specification object:

```JavaScript
// To create a viewer based on a Tinypass viewer:
bus.sendCommand({role: 'catalog', cmd: 'setItemSpec'}, {
    channel: 'abc',
    type: 'viewerSpec',
    source: 'tinypass-viewer',
    viewer: {uid: 'paul'}
});
```

#### Transform Functions
This library provides a default transform function for collections and assets. It is fine to use the default, but you can provide your own like this:

```JavaScript
const tinypassProvider = require('oddworks-tinypass-provider');
const bus = createMyOddcastBus();

const options = {
    bus: bus,
    viewerTransform: myViewerTransform
};

tinypassProvider.initialize(options).then(provider => {
    console.log('Initialized provider "%s"', provider.name);
}).catch(err => {
    console.error(err.stack || err.message || err);
});
```

Your transform functions `myViewerTransform` will be called when the `tinypass-viewer` have respectively received a response from the Tinypass API.

The `myViewerTransform` functions will each be called with 2 arguments: The spec object and the Tinypass API response object for an album or viewer, respectively.

See `lib/default-viewer-transform` for more info.

Tinypass API Client
-----------------
You can create a stand-alone API client outside of the Oddworks provider:

```JavaScript
const tinypassProvider = require('oddworks-tinypass-provider');

const client = tinypassProvider.createClient({
    bus: bus,
    apiToken: process.env.TINYPASS_API_TOKEN,
    applicationID: process.env.TINYPASS_APPLICATION_ID,
    sandbox: true
});
```

### Client Methods
All methods return a Promise.

- `client.getUserByEmail({userEmail})`
- `client.getUserResources({userId})`
- `client.getUserSubscriptions({userId})`

Command Line Interface
----------------------
You can interact with the Tinypass client using the CLI tool. To get started, run:

    bin/tinypass --help

To authenticate the API you'll need to export the following environment variables:

- `TINYPASS_API_TOKEN` The Tinypass API token
- `TINYPASS_APPLICATION_ID` The Tinypass Application ID (AID)

To get help with commands:

    bin/tinypass list --help
    bin/tinypass req --help

License
-------
Apache 2.0 © [Odd Networks](http://oddnetworks.com)
