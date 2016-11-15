'use strict';

const Boom = require('boom');
const Promise = require('bluebird');
const request = require('request');
const debug = require('debug')('oddworks:provider:tinypass:client');

const util = require('./util');

class Client {

	// spec.bus *optional
	// spec.apiToken *required
	constructor(spec) {
		this.bus = spec.bus || null;

		this.apiToken = spec.apiToken;
		this.applicationID = spec.applicationID;
		this.sandbox = Boolean(spec.sandbox) || false;

		this.getUserByEmail = this.getUserByEmail.bind(this);
		this.getUserResources = this.getUserResources.bind(this);
		this.getUserSubscriptions = this.getUserSubscriptions.bind(this);
		this.checkTrialUser = this.checkTrialUser.bind(this);
		// this.getAlbum = this.getAlbum.bind(this);
		// this.getVideosByAlbum = this.getVideosByAlbum.bind(this);
		// this.getVideos = this.getVideos.bind(this);
		// this.getVideo = this.getVideo.bind(this);
	}

	formatId(uri) {
		return util.formatId(uri);
	}

	// args.userEmail *required - See: https://api.tinypass.com/api-docs/dist/index.html#!/PublisherUser/search
	getUserByEmail(args) {
		args = args || {};

		if (!args.userEmail || typeof args.userEmail !== 'string') {
			throw new Error('A userEmail is required to getUserByEmail()');
		}

		args.path = '/publisher/user/search';

		debug(`getUserByEmail email: ${args.userEmail} path: ${args.path}`);
		args.query = Object.assign({}, {email: args.userEmail});

		return this.makeRequest(args)
			.then(body => {
				if (!Array.isArray(body.users)) {
					return null;
				}
				return body.users[0];
			});
	}

	// args.userEmail *required
	// args.resourceId *required
	checkTrialUser(args) {
		args = args || {};

		if (!args.userEmail || typeof args.userEmail !== 'string') {
			throw new Error('A userEmail is required to getUserByEmail()');
		}

		if (!args.resourceId || typeof args.resourceId !== 'string') {
			throw new Error('A resourceId is required to getUserByEmail()');
		}

		args.path = '/publisher/user/search';

		debug(`checkTrialUser email: ${args.userEmail} path: ${args.path}`);
		args.query = Object.assign({}, {email: args.userEmail, has_access: true, access_to_resources: args.resourceId});

		const nonTrialQuery = Object.assign({}, args.query, {trial_period: false});
		const trialQuery = Object.assign({}, args.query, {trial_period: true});

		const nonTrialArgs = Object.assign({}, args, {query: nonTrialQuery});
		const trialArgs = Object.assign({}, args, {query: trialQuery});

		return Promise.join(this.makeRequest(nonTrialArgs), this.makeRequest(trialArgs), (paidBody, trialBody) => {
			const paid = paidBody;
			const trial = trialBody;
			return {paid, trial};
		});
	}

	// args.userId *required - See: https://sandbox.tinypass.com/api/v3/publisher/user/access/list
	getUserResources(args) {
		args = args || {};

		if (!args.userId || typeof args.userId !== 'string') {
			throw new Error('An userId is required to getUserResources()');
		}

		args.path = `/publisher/user/access/list`;

		debug(`getUserResources uid: ${args.userId} path: ${args.path}`);
		args.query = Object.assign({}, {uid: args.userId});

		return this.makeRequest(args)
			.then(body => {
				if (!Array.isArray(body.accesses)) {
					return null;
				}
				return body.accesses;
			});
	}

	// args.userId *required - See: https://sandbox.tinypass.com/api/v3/publisher/user/access/list
	getUserSubscriptions(args) {
		args = args || {};

		if (!args.userId || typeof args.userId !== 'string') {
			throw new Error('An userId is required to getUserSubscriptions()');
		}

		args.path = `/publisher/subscription/stats`;

		debug(`getUserSubscriptions uid: ${args.userId} path: ${args.path}`);
		args.query = Object.assign({}, {uid: args.userId});

		return this.makeRequest(args)
			.then(body => {
				if (!Array.isArray(body.data)) {
					return null;
				}
				return body.data;
			});
	}

	// args.path *required
	// args.apiToken *required
	// args.applicationID *required
	makeRequest(args) {
		const method = 'GET';
		const path = args.path;

		const baseUrl = args.baseUrl || this.API_BASE_URL();

		const apiToken = args.apiToken || this.apiToken;
		const applicationID = args.applicationID || this.applicationID;

		if (!apiToken || typeof apiToken !== 'string') {
			throw new Error('An apiToken is required to makeRequest()');
		}
		if (!applicationID || typeof applicationID !== 'string') {
			throw new Error('An applicationID is required to makeRequest()');
		}
		if (!path || typeof path !== 'string') {
			throw new Error('A path is required to makeRequest()');
		}

		const headers = {};
		const qs = Object.assign({}, args.query, {api_token: apiToken, aid: applicationID});
		const url = `${baseUrl}${path}`;

		debug(`makeRequest method: ${method} url: ${url} qs: ${JSON.stringify(qs)}`);

		return Client.request({method, url, qs, headers});
	}

	API_BASE_URL() {
		return (this.sandbox) ? 'https://sandbox.tinypass.com/api/v3' : 'https://api.tinypass.com/api/v3';
	}

	static get CONTENT_TYPE_MATCHER() {
		return /^application\/json/;
	}

	static request(params) {
		return new Promise((resolve, reject) => {
			request(params, (err, res, body) => {
				if (err) {
					debug(`Client.request error: ${err}`);
					return reject(err);
				}

				if (res.statusCode === 404) {
					debug(`Client.request status: 404`);
					return resolve(null);
				}

				const isJson = Client.CONTENT_TYPE_MATCHER.test(res.headers['content-type']);

				if (isJson && typeof body === 'string') {
					try {
						body = JSON.parse(body);
					} catch (err) {
						debug(`Client.request error: JSON parsing error: ${err.message}`);
						return reject(new Error(
							`tinypass client JSON parsing error: ${err.message}`
						));
					}
				} else if (isJson) {
					debug(`Client.request error: received an empty json body`);
					return reject(new Error(
						`tinypass client received an empty json body`
					));
				} else {
					debug(`Client.request error: expects content-type to be application/*json`);
					return reject(new Error(
						`tinypass client expects content-type to be application/*json`
					));
				}

				if (res.statusCode !== 200) {
					debug(`Client.request status: ${res.statusCode} error: ${body.error} developer_message: ${body.developer_message}`);
					return reject(Boom.create(res.statusCode, res.statusMessage, body));
				}

				return resolve(body);
			});
		});
	}
}

module.exports = Client;
