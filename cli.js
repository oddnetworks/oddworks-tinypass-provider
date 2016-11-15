'use strict';

const Promise = require('bluebird');
const yargs = require('yargs');
const Client = require('./lib/client');

const REQUEST_METHODS = Object.create(null);
REQUEST_METHODS.makeRequest = '{"path": "STRING"}';
REQUEST_METHODS.getUserByEmail = '{"userEmail": "STRING"}';
REQUEST_METHODS.getUserResources = '{"userId": "STRING"}';
REQUEST_METHODS.getUserSubscriptions = '{"userId": "STRING"}';
REQUEST_METHODS.checkTrialUser = '{"userEmail": "STRING"}';

const listCommand = () => {
	console.log('Request methods:');
	console.log('');

	Object.getOwnPropertyNames(Client.prototype).forEach(key => {
		if (REQUEST_METHODS[key]) {
			console.log(`\t${key} --args ${REQUEST_METHODS[key]}`);
		}
	});

	return Promise.resolve(null);
};

const requestCommand = args => {
	const apiToken = args.apiToken;
	const applicationID = args.applicationID;
	const method = args.method;

	if (!apiToken) {
		console.error('An apiToken is required (--apiToken)');
		return Promise.resolve(null);
	}

	if (!applicationID) {
		console.error('An applicationID is required (--applicationID)');
		return Promise.resolve(null);
	}

	let params;
	try {
		params = JSON.parse(args.args);
	} catch (err) {
		console.error('--args JSON parsing error:');
		console.error(err.message);
		return Promise.resolve(null);
	}

	const client = new Client({apiToken, applicationID, sandbox: args.sandbox});

	return client[method](params).then(res => {
		console.log(JSON.stringify(res, null, 2));
		return null;
	});
};

exports.main = () => {
	const args = yargs
					.usage('Usage: $0 <command> [options]')
					.command('req', 'Make a tinypass client request', {
						method: {
							alias: 'm',
							default: 'makeRequest',
							describe: 'Use the "list" command to see available methods'
						},
						args: {
							alias: 'a',
							default: '{}',
							describe: 'Arguments object as a JSON string'
						},
						sandbox: {
							default: false,
							describe: 'Make requests to the Tinypass sandbox api'
						},
						apiToken: {
							describe: 'Defaults to env var TINYPASS_API_TOKEN'
						},
						applicationID: {
							describe: 'Defaults to env var TINYPASS_APPLICATION_ID'
						}
					})
					.command('list', 'List tinypass client methods')
					.help();

	const argv = args.argv;
	const command = argv._[0];

	switch (command) {
		case 'list':
			return listCommand();
		case 'req':
			return requestCommand({
				sandbox: argv.sandbox,
				apiToken: argv.apiToken || process.env.TINYPASS_API_TOKEN,
				applicationID: argv.applicationID || process.env.TINYPASS_APPLICATION_ID,
				method: argv.method,
				args: argv.args
			});
		default:
			console.error('A command argument is required.');
			console.error('Use the --help flag to print out help.');
			return Promise.resolve(null);
	}
};
