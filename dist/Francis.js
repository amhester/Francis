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

        self.transactions = {};
    }

    _createClass(Francis, [{
        key: 'abortAll',
        value: function abortAll() {
            var self = this;

            self.status = Francis.QUERIER_STATUS.ABORTING;
            while (self.workingRequests.length) {
                var item = self.workingRequests.shift();
                item.xhr.abort();
            }
            ///TODO: Either set status back to normal or whatever and handle any ready transactions.
        }
    }, {
        key: 'abortTransaction',
        value: function abortTransaction(transactionName) {
            var self = this;

            var transaction = self.transactions[transactionName];
            transaction.status = Francis.QUERIER_STATUS.ABORTING;
            for (var i = 0; i < self.workingRequests.length; i++) {
                var r = self.workingRequests[i];
                if (r.transactionId === transaction.context.transactionId) {
                    r.xhr.abort();
                    self.workingRequests.splice(i, 1);
                }
            }
        }
    }, {
        key: 'query',
        value: function query(transactionName, ajaxObject, options) {
            var self = this;

            self._addActionToTransaction(transactionName, ajaxObject);

            return this;
        }
    }, {
        key: 'createTransaction',
        value: function createTransaction(transactionName, options) {
            var self = this;

            if (self.transactions.hasOwnProperty(transactionName)) {
                ///TODO: Should this method abort any transaction with the specified name if there exists one already?
                ///TODO: Or how should this handle an existing transaction with the same name??
            }

            self._createTransaction(transactionName);

            if (options) {
                var transaction = self.transactions[transactionName];
                transaction.mode = options.mode || transaction.mode;
                transaction.transactionError = options.transactionError || transaction.transactionError;
                transaction.finalize = options.finalize || transaction.finalize;
            }

            return this;
        }
    }, {
        key: 'startAll',
        value: function startAll() {
            var self = this;
        }
    }, {
        key: 'startTransaction',
        value: function startTransaction(transactionName) {
            var self = this;
        }
    }, {
        key: 'stopAll',
        value: function stopAll() {
            var self = this;
        }
    }, {
        key: 'stop',
        value: function stop(transactionName) {
            var self = this;
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

            context.transactionId = 'something'; // Need a uuid
        }
    }, {
        key: '_addActionToTransaction',
        value: function _addActionToTransaction(transactionName, ajaxObject) {
            var self = this;

            var transaction = self.transactions[transactionName];
            var requestId = 'something'; // Need a uuid

            ///TODO: add appropriate headers to ajaxObject (x-transaction-id, x-request-id)

            if (transaction.mode === Francis.QUERIER_MODE.SINGLE) {
                (function () {
                    var origSuccess = ajaxObject.success;
                    ajaxObject.success = function () {
                        successCount++;
                        ///TODO: add next item in transaction queue to global worker queue.
                        ///TODO: If last action in transaction queue, call finalize.
                        if (origSuccess && typeof origSuccess === 'function') {
                            origSuccess();
                        }
                    };

                    var origError = ajaxObject.error;
                    ajaxObject.error = function () {
                        failedCount++;
                        ///TODO: add next item in transaction queue to global worker queue.
                        ///TODO: If last action in transaction queue, call finalize.
                        if (origError && typeof origError === 'function') {
                            origError();
                        }
                    };
                })();
            } else if (transaction.mode === Francis.QUERIER_MODE.PARALLEL) {
                (function () {
                    var origSuccess = ajaxObject.success;
                    ajaxObject.success = function () {
                        successCount++;
                        ///TODO: add next item in transaction queue to global worker queue.
                        ///TODO: If last action in transaction queue, call finalize.
                        if (origSuccess && typeof origSuccess === 'function') {
                            origSuccess();
                        }
                    };

                    var origError = ajaxObject.error;
                    ajaxObject.error = function () {
                        failedCount++;
                        ///TODO: add next item in transaction queue to global worker queue.
                        ///TODO: If last action in transaction queue, call finalize.
                        if (origError && typeof origError === 'function') {
                            origError();
                        }
                    };
                })();
            } else {
                return false;
            }

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
                        ///I think I'm done checking shit for other cases... for now
                        self.workQueue.push(transaction.actions.shift());
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
                READY: 0x8
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