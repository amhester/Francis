'use strict';

class Francis {
    constructor (options) {
        let self = this;

        self.status = Francis.QUERIER_STATUS.IDLE;
        self.workQueue = [];
        self.readyTransactions = [];
        self.workingRequests = [];
        self.currentTransaction = '';
        self.logger = options.logger || console;
        self.mode = options.mode || Francis.QUERIER_MODE.PARALLEL;

        self.transactions = {};
    }

    abortAll () {
        let self = this;

        self.status = Francis.QUERIER_STATUS.ABORTING;
        while(self.workingRequests.length) {
            let item = self.workingRequests.shift();
            item.xhr.abort();
        }
        ///TODO: Either set status back to normal or whatever and handle any ready transactions. idk...
    }

    abortTransaction (transactionName) {
        let self = this;

        let transaction = self.transactions[transactionName];
        transaction.status = Francis.QUERIER_STATUS.ABORTING;
        for(let i = 0; i < self.workingRequests.length; i++) {
            let r = self.workingRequests[i];
            if(r.transactionId === transaction.context.transactionId) {
                r.xhr.abort();
                self.workingRequests.splice(i, 1);
            }
        }
    }

    query (transactionName, ajaxObject, options) {
        let self = this;

        self._addActionToTransaction(transactionName, ajaxObject);

        return this;
    }

    createTransaction (transactionName, options) {
        let self = this;

        if(self.transactions.hasOwnProperty(transactionName)) {
            ///TODO: Should this method abort any transaction with the specified name if there exists one already?
            ///TODO: Or how should this handle an existing transaction with the same name??
        }

        self._createTransaction(transactionName);

        if(options) {
            let transaction = self.transactions[transactionName];
            transaction.mode = options.mode || transaction.mode;
            transaction.transactionError = options.transactionError || transaction.transactionError;
            transaction.finalize = options.finalize || transaction.finalize;
        }

        return this;
    }

    startAll () {
        let self = this;
    }

    startTransaction (transactionName) {
        let self = this;
    }

    stopAll () {
        let self = this;
    }

    stop (transactionName) {
        let self = this;
    }

    _createTransaction (transactionName) {
        let self = this;

        self.transactions[transactionName] = {
            name: transactionName,
            context: {},
            actions: [],
            status: Francis.QUERIER_STATUS.IDLE,
            mode: Francis.QUERIER_MODE.SINGLE,
            failedCount: 0,
            successCount: 0,
            ended: false,
            transactionError: function () { self.logger.log('oops, something went wrong :('); },
            finalize: function () { self.logger.log('yay, it worked :)'); }
        };

        context.transactionId = 'something'; // Need a uuid
    }

    _addActionToTransaction (transactionName, ajaxObject) {
        let self = this;

        let transaction = self.transactions[transactionName];
        let requestId = 'something'; // Need a uuid

        ///TODO: add appropriate headers to ajaxObject (x-transaction-id, x-request-id)

        if(transaction.mode === Francis.QUERIER_MODE.SINGLE) {
            let origSuccess = ajaxObject.success;
            ajaxObject.success = function () {
                successCount++;
                ///TODO: add next item in transaction queue to global worker queue.
                ///TODO: If last action in transaction queue, call finalize.
                if(origSuccess && typeof origSuccess === 'function') {
                    origSuccess();
                }
            };

            let origError = ajaxObject.error;
            ajaxObject.error = function () {
                failedCount++;
                ///TODO: add next item in transaction queue to global worker queue.
                ///TODO: If last action in transaction queue, call finalize.
                if(origError && typeof origError === 'function') {
                    origError();
                }
            };
        } else if (transaction.mode === Francis.QUERIER_MODE.PARALLEL) {
            let origSuccess = ajaxObject.success;
            ajaxObject.success = function () {
                successCount++;
                ///TODO: add next item in transaction queue to global worker queue.
                ///TODO: If last action in transaction queue, call finalize.
                if(origSuccess && typeof origSuccess === 'function') {
                    origSuccess();
                }
            };

            let origError = ajaxObject.error;
            ajaxObject.error = function () {
                failedCount++;
                ///TODO: add next item in transaction queue to global worker queue.
                ///TODO: If last action in transaction queue, call finalize.
                if(origError && typeof origError === 'function') {
                    origError();
                }
            };
        } else {
            return false;
        }

        //Add item to the transaction action queue
        transaction.actions.push({ transactionName: transactionName, transactionId: transaction.context.transactionId, requestId: requestId, ajaxObject: ajaxObject });
    }

    _performActualQuery (workItem) {
        let self = this;

        self.currentTransaction = workItem.transactionName;
        self.workingRequests.push({
            transactionName: workItem.transactionName,
            transactionId: workItem.transactionId,
            requestId: workItem.requestId,
            xhr: $.ajax(workItem.ajaxObject)
        });
    }

    _requestDone (transaction) {
        let self = this;

        if(transaction.actions.length) {
            if(transaction.status !== Francis.QUERIER_STATUS.READY && self.status === Francis.QUERIER_STATUS.LOCKED || (self.mode === Francis.QUERIER_MODE.SINGLE && self.currentTransaction !== transaction.name)) {
                self.readyTransactions.push(transaction.name);
                transaction.status = Francis.QUERIER_STATUS.READY;
            } else if (transaction.status === Francis.QUERIER_STATUS.LOCKED || transaction.status === Francis.QUERIER_STATUS.ABORTING) {
                ///TODO: probably just do nothing
            } else {
                ///I think I'm done checking shit for other cases... for now
                self.workQueue.push(transaction.actions.shift());
            }
        } else {
            if(transaction.ended) {
                transaction.finalize();
            }
        }

        self._doWork();
    }

    _doWork () {
        let self = this;

        if(self.workQueue.length && (self.status === Francis.QUERIER_STATUS.IDLE || self.status === Francis.QUERIER_STATUS.WORKING)) {
            let workItem = self.workQueue.shift();
            self._performActualQuery(workItem);
        }
    }

    static get QUERIER_STATUS () {
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

    static get QUERIER_MODE () {
        return {
            PARALLEL: 0x1,
            SINGLE: 0x2
        };
    }
}