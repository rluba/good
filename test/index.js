'use strict';

// Load modules

const Code = require('code');
const Hapi = require('hapi');
const Lab = require('lab');

const Good = require('../lib');
const GoodReporter = require('./helper');
const Monitor = require('../lib/monitor');


// Test shortcuts

const lab = exports.lab = Lab.script();
const expect = Code.expect;
const describe = lab.describe;
const it = lab.it;


describe('good', () => {

    it('exposes the Monitor object', (done) => {

        const plugin = {
            register: Good.register,
            options: {
                reporters: [{
                    reporter: GoodReporter,
                    events: { response: '*' }
                }]
            }
        };
        const server = new Hapi.Server();
        server.register(plugin, (err) => {

            expect(err).to.not.exist();
            expect(server.plugins.good.monitor).to.be.an.object();
            done();
        });
    });

    it('starts the Monitor object during registration', (done) => {

        const plugin = {
            register: Good.register,
            options: {
                reporters: [{
                    reporter: GoodReporter,
                    events: { response: '*' }
                }]
            }
        };
        const server = new Hapi.Server();
        let called = false;
        const start = Monitor.prototype.start;
        Monitor.prototype.start = (callback) => {

            Monitor.prototype.start = start;
            called = true;
            callback();
        };

        server.register(plugin, (err) => {

            expect(err).to.not.exist();
            expect(called).to.be.true();
            done();
        });
    });

    it('starts the ops monitor when the server starts', (done) => {

        const plugin = {
            register: Good.register,
            options: {
                reporters: [{
                    reporter: GoodReporter,
                    events: { response: '*' }
                }],
                ops: {
                    interval: 2000
                }
            }
        };
        const server = new Hapi.Server();
        server.register(plugin, (err) => {

            expect(err).to.not.exist();
            server.connection();
            server.start((err) => {

                expect(err).to.not.exist();
                expect(server.plugins.good.monitor._ops._interval._repeat).to.be.a.function();
                done();
            });
        });
    });

    it('stops the monitor when the server stops', (done) => {

        const plugin = {
            register: Good.register,
            options: {
                reporters: [{
                    reporter: GoodReporter,
                    events: { response: '*' }
                }]
            }
        };
        const server = new Hapi.Server();
        let called = false;
        const stop = Monitor.prototype.stop;
        Monitor.prototype.stop = (callback) => {

            Monitor.prototype.stop = stop;
            called = true;
            return callback();
        };


        server.register(plugin, (err) => {

            expect(err).to.not.exist();

            server.stop(() => {

                expect(called).to.be.true();
                done();
            });
        });
    });

    it(`throws an error if responseEvent is not 'response' or 'tail'`, (done) => {

        const plugin = {
            register: Good.register,
            options: {
                responseEvent: 'fobar'
            }
        };
        const server = new Hapi.Server();
        const fn = () => {

            server.register(plugin, () => {});
        };

        expect(fn).to.throw(Error, /"responseEvent" must be one of \[response, tail\]/gi);
        done();
    });

    it('supports a mix of reporter options', (done) => {

        const plugin = {
            register: Good.register,
            options: {
                responseEvent: 'response',
                reporters: [
                    new GoodReporter({ ops: '*' }), {
                        reporter: GoodReporter,
                        events: { ops: '*' }
                    }
                ]
            }
        };
        const server = new Hapi.Server();

        server.register(plugin, (err) => {

            expect(err).to.not.exist();
            expect(server.plugins.good.monitor._dataStream.listeners('data')).to.have.length(2);
            done();
        });
    });

    it('supports passing a module name or path for the reporter function', (done) => {

        const plugin = {
            register: Good.register,
            options: {
                responseEvent: 'response',
                reporters: [{
                    reporter: '../test/helper',
                    events: { log: '*' }
                }]
            }
        };
        const server = new Hapi.Server();

        server.register(plugin, (err) => {

            expect(err).to.not.exist();
            expect(server.plugins.good.monitor._dataStream.listeners('data')).to.have.length(1);
            done();
        });
    });

    it('allows starting with no reporters', (done) => {

        const plugin = {
            register: Good.register,
            options: {
                responseEvent: 'response'
            }
        };
        const server = new Hapi.Server();

        server.register(plugin, (err) => {

            expect(err).to.not.exist();
            expect(server.plugins.good.monitor._dataStream.listeners('data')).to.have.length(0);
            done();
        });
    });

    it('throws an error if invalid extension events are used', (done) => {

        const plugin = {
            register: Good.register,
            options: {
                extensions: ['tail']
            }
        };
        const server = new Hapi.Server();
        const fn = () => {

            server.register(plugin, () => {});
        };

        expect(fn).to.throw(Error, 'Invalid monitorOptions options child "extensions" fails because ["extensions" at position 0 fails because ["0" contains an invalid value]]');
        done();
    });
});
