'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Francis = function () {
    function Francis(options) {
        _classCallCheck(this, Francis);

        var self = this;

        self.status = Francis.QUERIER_STATUS.IDLE;
        self.workQueue = [];
        self.readyTransactions = [];
        self.workingRequests = [];
        self.currentTransaction = '';
        self.logger = options.logger || console;
        self.mode = options.mode || Francis.QUERIER_MODE.PARALLEL;
        self.uniqueTransactions = options.uniqueTransactions || true;

        self.transactions = {};
    }

    _createClass(Francis, [{
        key: 'abortAll',
        value: function abortAll() {
            var self = this;

            self.status = Francis.QUERIER_STATUS.ABORTING;

            for (var key in self.transactions) {
                if (self.transactions.hasOwnProperty(key)) {
                    self.abortTransaction(key); //because the key in the map is the transactionName
                }
            }

            self.status = Francis.QUERIER_STATUS.IDLE;
            ///TODO: Either set status back to normal or whatever and handle any ready transactions. idk...
            ///WJ: I think we move back to idle at this point. maybe also bubble an event/execute a callback
            ///for the user to handle the abort all, and even better, this method should probably call the abort
            ///transaction and do that work at a low level. Really we should have a single point of callback
            ///or event bubbling and just send the type of event that triggered it

            return self;
        }
    }, {
        key: 'removeTransaction',
        value: function removeTransaction(transactionName) {
            var self = this;
            self._removeTransaction(transactionName);
            return self;
        }
    }, {
        key: 'abortTransaction',
        value: function abortTransaction(transactionName) {
            var self = this;
            self._abortTransaction(transactionName);
            return self;
        }
    }, {
        key: 'query',
        value: function query(transactionName, ajaxObject, options) {
            var self = this;
            self._addActionToTransaction(transactionName, ajaxObject);
            return self;
        }
    }, {
        key: 'createTransaction',
        value: function createTransaction(transactionName, options) {
            var self = this;

            if (self.transactions.hasOwnProperty(transactionName)) {
                if (self.uniqueTransactions) {
                    self._removeTransaction(transactionName);
                    self._createTransaction(transactionName);
                }
            } else {
                ///TODO: Should probably figure out how to properly handle multiple transactions going concurrently of the same type. Honestly, should probably just not let it happen, but we can talk about it.
                self._createTransaction(transactionName);
            }

            if (options) {
                self._setTransactionOptions(self.transactions[transactionName], options);
            }
            return self;
        }
    }, {
        key: 'startAll',
        value: function startAll() {
            var self = this;
            return self;
        }
    }, {
        key: 'startTransaction',
        value: function startTransaction(transactionName) {
            var self = this;
            return self;
        }
    }, {
        key: 'stopAll',
        value: function stopAll() {
            var self = this;
            return self;
        }
    }, {
        key: 'stop',
        value: function stop(transactionName) {
            var self = this;
            return self;
        }
    }, {
        key: '_setTransactionOptions',
        value: function _setTransactionOptions(transaction, options) {
            transaction.mode = options.mode || transaction.mode;
            transaction.transactionError = options.transactionError || transaction.transactionError;
            transaction.finalize = options.finalize || transaction.finalize;
            return transaction;
        }
    }, {
        key: '_createTransaction',
        value: function _createTransaction(transactionName) {
            var self = this;

            self.transactions[transactionName] = {
                name: transactionName,
                context: {},
                actions: [],
                status: Francis.QUERIER_STATUS.IDLE,
                mode: Francis.QUERIER_MODE.SINGLE,
                failedCount: 0,
                successCount: 0,
                ended: false,
                transactionError: function transactionError() {
                    self.logger.log('oops, something went wrong :(');
                },
                finalize: function finalize() {
                    self.logger.log('yay, it worked :)');
                }
            };

            self.transactions[transactionName].context.transactionId = 'something'; // Need a uuid
        }
    }, {
        key: '_removeTransaction',
        value: function _removeTransaction(transactionName) {
            var self = this;
            //self.status = Francis.QUERIER_STATUS.CLEANUP; //I don't think it's necessary to change the global status whenever you're removing a transaction
            self._abortTransaction(transactionName);
            //Filter won't work on an object (just checked)
            //self.transactions = self.transactions.filter(transaction => transaction.name !== transactionName);
            delete self.transactions[transactionName];
            //self.status = Francis.QUERIER_STATUS.READY; //Same comment as above
        }
    }, {
        key: '_abortTransaction',
        value: function _abortTransaction(transactionName) {
            var self = this;

            var transaction = self.transactions[transactionName];
            //If the transaction is already aborting, just return.
            if (transaction.status === Francis.QUERIER_STATUS.ABORTING) return false;

            var transactionId = transaction.context.transactionId;

            //Set up aborting state
            transaction.status = Francis.QUERIER_STATUS.ABORTING;

            //What are your thoughts on this change, should minimize the amount of looping over stuff.
            for (var i = 0; i < self.workingRequests.length; i++) {
                var workItem = self.workingRequests[i];
                if (workItem.transactionId === transactionId) {
                    workItem.xhr.abort();
                }
            }

            //reset to idle state
            //transaction.status = Francis.QUERIER_STATUS.IDLE; //Should probably set this after the transactionHandler or finalize callbacks get called, or more likely just remove the transaction when done.

            self.logger.log('Transaction [' + transaction.name + '] aborted successfully. ' + requestsToAbort.length + ' related requests canceled.');
        }
    }, {
        key: '_addActionToTransaction',
        value: function _addActionToTransaction(transactionName, ajaxObject) {
            var self = this;

            var transaction = self.transactions[transactionName];
            var requestId = 'something'; // Need a uuid

            ///TODO: add appropriate headers to ajaxObject (x-transaction-id, x-request-id)

            var origSuccess = ajaxObject.success;
            ajaxObject.success = function () {
                transaction.successCount++;
                self._removeItemFromWorkQueue(requestId);
                self._requestDone(transaction);
                if (origSuccess && typeof origSuccess === 'function') {
                    origSuccess();
                }
            };

            var origError = ajaxObject.error;
            ajaxObject.error = function () {
                transaction.failedCount++;
                self._removeItemFromWorkQueue(requestId);
                self._requestDone(transaction);
                if (origError && typeof origError === 'function') {
                    origError();
                }
            };

            //Add item to the transaction action queue
            transaction.actions.push({ transactionName: transactionName, transactionId: transaction.context.transactionId, requestId: requestId, ajaxObject: ajaxObject });
        }
    }, {
        key: '_performActualQuery',
        value: function _performActualQuery(workItem) {
            var self = this;

            self.currentTransaction = workItem.transactionName;
            self.workingRequests.push({
                transactionName: workItem.transactionName,
                transactionId: workItem.transactionId,
                requestId: workItem.requestId,
                xhr: $.ajax(workItem.ajaxObject)
            });
        }
    }, {
        key: '_removeItemFromWorkQueue',
        value: function _removeItemFromWorkQueue(requestId) {
            var self = this;

            for (var i = 0; i < self.workingRequests.length; i++) {
                var workItem = self.workingRequests[i];
                if (workItem.requestId === requestId) {
                    self.workingRequests.splice(i, 1);
                    return true;
                }
            }
            return false;
        }
    }, {
        key: '_requestDone',
        value: function _requestDone(transaction) {
            var self = this;

            if (transaction.actions.length) {
                if (transaction.status !== Francis.QUERIER_STATUS.READY && self.status === Francis.QUERIER_STATUS.LOCKED || self.mode === Francis.QUERIER_MODE.SINGLE && self.currentTransaction !== transaction.name) {
                    self.readyTransactions.push(transaction.name);
                    transaction.status = Francis.QUERIER_STATUS.READY;
                } else if (transaction.status === Francis.QUERIER_STATUS.LOCKED || transaction.status === Francis.QUERIER_STATUS.ABORTING) {
                    ///TODO: probably just do nothing
                } else {
                        if (transaction.mode === Francis.QUERIER_MODE.SINGLE) {
                            self.workQueue.push(transaction.actions.shift());
                        }
                    }
            } else {
                if (transaction.ended) {
                    transaction.finalize();
                }
            }

            self._doWork();
        }
    }, {
        key: '_doWork',
        value: function _doWork() {
            var self = this;

            if (self.workQueue.length && (self.status === Francis.QUERIER_STATUS.IDLE || self.status === Francis.QUERIER_STATUS.WORKING)) {
                var workItem = self.workQueue.shift();
                self._performActualQuery(workItem);
            }
        }
    }], [{
        key: 'QUERIER_STATUS',
        get: function get() {
            return {
                IDLE: 0x1,
                WORKING: 0x2,
                AWAITING_RESPONSE: 0x3,
                HANDLING_RESPONSE: 0x4,
                ERROR: 0x5,
                LOCKED: 0x6,
                ABORTING: 0x7,
                READY: 0x8,
                CLEANUP: 0x9
            };
        }
    }, {
        key: 'QUERIER_MODE',
        get: function get() {
            return {
                PARALLEL: 0x1,
                SINGLE: 0x2
            };
        }
    }]);

    return Francis;
}();