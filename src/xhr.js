"use strict";

class FrancisXHR {
    constructor(config) {
        let self = this;

        let defaultOptions = {
            type: FrancisXHR.TYPES.GET,
            url: '',
            headers: {},
            timeout: 10000,
            responseType: 'json',
            cors: false,
            body: null
        };

        self.options = Object.assign({}, defaultOptions, config);
        if (self.options.cors && new XMLHttpRequest().withCredentials === undefined) {
            self.xhr = new XDomainRequest();
        } else {
            self.xhr = new XMLHttpRequest();
        }
        self.aborted = false;
        self.callbacks = [];
    }

    _bindEvents() {
        let self = this;

        self.xhr.onload = () => {
            self._onLoad();
        };

        self.xhr.onabort = () => {
            self._onAbort();
        };

        self.xhr.ontimeout = () => {
            self._onTimeout();
        };

        self.xhr.onerror = () => {
            self._onError();
        };

        self.xhr.onreadystatechange = () => {
            self._onReadyStateChange();
        };
    }

    _onLoad() {
        let self = this;

        if(self.aborted) {
            return false;
        }

        self._processResponseText();
        while(self.callbacks.length) {
            self.callbacks.unshift()(self.xhr.status, self.xhr.processedResponse, self.xhr);
        }
    }

    _onAbort() {

    }

    _onTimeout() {

    }

    _onError() {

    }

    _onReadyStateChange() {

    }

    _processResponseText() {
        let self = this;

        switch(self.options.responseType) {
            case 'json':
                try {
                    self.xhr.processedResponse = JSON.parse(self.xhr.responseText);
                }
                catch (e) {
                    self.xhr.processedResponse = self.xhr.responseText;
                }
                break;
            default:
                self.xhr.processedResponse = self.xhr.responseText;
                break;
        }
    }

    _encodeRequestData(data) {
        let self = this;

        if(self.options.type === FrancisXHR.TYPES.GET) return null;

        let _data = null;
        switch(self.options.contentType) {
            default:
                var encodedString = '';
                for (var prop in data) {
                    if (data.hasOwnProperty(prop)) {
                        if (encodedString.length > 0) {
                            encodedString += '&';
                        }
                        encodedString += encodeURI(prop + '=' + object[data]);
                    }
                }
                data = encodedString;
                break;
        }
        return _data;
    }

    _setHeaders() {
        let self = this;
    }

    then(cb) {
        let self = this;
        if(self.xhr.readyState === XMLHttpRequest.DONE) {
            if(self.xhr.status === 200) {
                cb(self.xhr.status, self.xhr.processedResponse, self.xhr);
            }
        } else {
            self.callbacks.push((status, res, xhr) => {
                if(xhr.status === 200) {
                    cb(status, res, xhr);
                }
            });
        }
        return this;
    }

    error(cb) {
        let self = this;
        if(self.xhr.readyState === XMLHttpRequest.DONE) {
            if(self.xhr.status !== 200) {
                cb(self.xhr.status, self.xhr.responseText, self.xhr);
            }
        } else {
            self.callbacks.push((status, res, xhr) => {
                if(xhr.status !== 200) {
                    cb(status, res, xhr);
                }
            });
        }
        return this;
    }

    abort() {
        let self = this;
        self.aborted = true;
        self.xhr.abort();
        return this;
    }

    send() {
        let self = this;
        self.xhr.open(self.options.type, self.options.url);
        self.xhr.timeout = self.options.timeout;
        self._setHeaders();
        self._bindEvents();
        let data = self._encodeRequestData();
        self.xhr.send(data);
        return this;
    }

    static get (config) {
        return new FrancisXHR(Object.assign({}, config, { type: 'get' })).send();
    }

    static post (config) {
        return new FrancisXHR(Object.assign({}, config, { type: 'post' })).send();
    }

    static put (config) {
        return new FrancisXHR(Object.assign({}, config, { type: 'put' })).send();
    }

    static del (config) {
        return new FrancisXHR(Object.assign({}, config, { type: 'delete' })).send();
    }

    static get TYPES() {
        return {
            GET: 'GET',
            POST: 'POST',
            PUT: 'PUT',
            DEL: 'DELETE'
        };
    }
}