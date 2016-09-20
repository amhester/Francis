"use strict";

class FrancisWSPool {
    constructor(config) {
        let self = this;

        let defaultSettings = {
            maxPoolSize: 20
        };
        self.settings = Object.assign({}, defaultSettings, config);
    }

    send() {

    }
}