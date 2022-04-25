(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define('cookieManager', ['exports'], factory) :
	(factory((global.cookieManager = {})));
}(this, (function (exports) { 'use strict';

    // Prevents JavaScript errors when running on browsers without console/log.
    if(typeof console === "undefined") {
        console = {
            log: function() {},
            info: function() {},
            debug: function() {},
            warn: function() {},
            error: function() {}
        };
    }

    const defaultOptions = {
        "delete-undefined-cookies": true,
        "user-preference-cookie-name": "cm-user-preferences",
        "user-preference-cookie-secure": false,
        "user-preference-cookie-expiry-days": 365,
        "user-preference-configuration-form-id": false,
        "user-preference-saved-callback": false,
        "cookie-banner-id": false,
        "cookie-banner-visibility-class": "hidden",
        "cookie-banner-visible-on-page-with-preference-form": true,
        "cookie-manifest": []
    };

    let options = {};

    const init = function (custom_options) {

        options = defaultOptions;

        for (const item in custom_options) {
            options[item] = custom_options[item];
        }

        console.debug(options);

        manageCookies();
        findAndBindPreferencesForm();
        findAndBindCookieBanner();
    };

    const manageCookies = function() {

        const cm_cookie = options['user-preference-cookie-name'];
        const cm_user_preferences = getUserPreferences(cm_cookie);

        if (!cm_user_preferences) {
            console.info(
                'User preference cookie is not set or valid. ' +
                'This cookie defines user preferences. ' +
                'Assuming non-consent, and deleting all non-essential cookies if config allows.'
            );
        }

        const current_cookies = decodeURIComponent(document.cookie).split(';');

        // If there are no cookies set
        if (current_cookies.length === 1 && current_cookies[0].match(/^ *$/)) {
            return;
        }

        for (var i = 0; i < current_cookies.length; i++) {

            const cookie_name = current_cookies[i].split(/=(.*)/)[0].trim();

            // Skip, if cookie is user preferences cookie
            if (cookie_name === cm_cookie) {
                continue;
            }

            const cookie_category = getCookieCategoryFromManifest(cookie_name);

            if (cookie_category === false) {
                if (options['delete-undefined-cookies']) {
                    console.info(`Cookie "${cookie_name}" is not in the manifest and "delete-undefined-cookies" is enabled; deleting.`);
                    deleteCookie(cookie_name);
                } else {
                    console.info(`Cookie "${cookie_name}" is not in the manifest and "delete-undefined-cookies" is disabled; skipping.`);
                }
                continue;
            }

            if (cookie_category['optional'] === false) {
                console.debug(`Cookie "${cookie_name}" is marked as non-optional; skipping.`);
                continue;
            }

            if (!cm_user_preferences || cm_user_preferences.hasOwnProperty(cookie_category['category-name']) === false) {
                console.info(`Cookie "${cookie_name}" is listed  Cannot find category "${cookie_category['category_name']}" in user preference cookie "${cm_cookie}"; assuming non-consent; deleting.`);
                deleteCookie(cookie_name);
                continue;
            }

            if (cm_user_preferences[cookie_category['category-name']] === 'off' || cm_user_preferences[cookie_category['category-name']] === 'false') {
                console.info(`Cookie "${cookie_name}" is listed under category "${cookie_category['category-name']}"; user preferences opts out of this category; deleting.`);
                deleteCookie(cookie_name);
                continue;
            }

            console.info(`Cookie "${cookie_name}" is listed under category "${cookie_category['category-name']}"; user preferences opts in-to this category; cleared for use.`);
        }

        console.debug(`Finishing processing all cookies.`);
    };

    const getUserPreferences = function() {

        const cookie = getCookie(options['user-preference-cookie-name']);

        if (!cookie) {
            return false;
        }

        try {
            return JSON.parse(cookie);
        } catch (e) {
            console.error(`Unable to parse user preference cookie "${cm_cookie}" as JSON.`, e);
            return false;
        }
    };

    const getCookieCategoryFromManifest = function(cookie_name) {

        const cookie_manifest = options['cookie-manifest'];

        for (var i = 0; i < cookie_manifest.length; i++) {
            const category_cookies = cookie_manifest[i]['cookies'];
            for (var x = 0; x < category_cookies.length; x++) {
                const cookie_prefix = category_cookies[x];
                if (cookie_name.startsWith(cookie_prefix)) {
                    console.debug(`Cookie "${cookie_name}" found in manifest.`);
                    return cookie_manifest[i];
                }
            }
        }
        console.debug(`Cookie "${cookie_name}" NOT found in manifest.`);
        return false;
    };

    const getCookie = function(cookie_name) {
        const name = cookie_name + "=";
        const decoded_cookie = decodeURIComponent(document.cookie);
        const cookie_array = decoded_cookie.split(';');

        for(var i = 0; i < cookie_array.length; i++) {
            let cookie_part = cookie_array[i];
            while (cookie_part.charAt(0) === ' ') {
                cookie_part = cookie_part.substring(1);
            }
            if (cookie_part.indexOf(name) === 0) {
                return cookie_part.substring(name.length, cookie_part.length);
            }
        }
        return false;
    };

    const deleteCookie = function(cookie_name) {
        deleteCookieWithoutDomain(cookie_name);

        if(configOptionIsNotEmptyObject('domains')) {
            let dotHostname = "." + window.location.hostname;
            for(var i = 0; i < options['domains'].length; i++) {
                if (dotHostname.indexOf(options['domains'][i]) >=0) {
                    deleteCookieFromDomain(cookie_name, options['domains'][i]);
                }
            }
        } else {
            deleteCookieFromCurrentAndUpperDomain(cookie_name);
        }

        console.debug(`Deleted cookie "${cookie_name}"`);
    };

    const deleteCookieWithoutDomain = function (cookie_name) {
        document.cookie = cookie_name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/;';
    };

    const deleteCookieFromCurrentAndUpperDomain = function (cookie_name) {
        let hostname = window.location.hostname;
        let dotHostname = "." + hostname;
        document.cookie = cookie_name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;domain='+ hostname +';path=/;';
        document.cookie = cookie_name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;domain='+ dotHostname +';path=/;';

        let firstDot = hostname.indexOf('.');
        let upperDomain = hostname.substring(firstDot);
        let dotUpperDomain = "." + upperDomain;
        document.cookie = cookie_name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;domain='+ upperDomain +';path=/;';
        document.cookie = cookie_name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;domain='+ dotUpperDomain +';path=/;';
    };

    const deleteCookieFromDomain = function(cookie_name, domain) {
        let dotDomain = "." + domain;
        document.cookie = cookie_name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;domain=' + domain + ';path=/;';
        document.cookie = cookie_name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;domain=' + dotDomain + ';path=/;';
        console.debug('delete ' + cookie_name + ' in ' + domain + ' and ' + dotDomain);
    };

    const setCookie = function(cookie_value) {

        const cookie_name = options['user-preference-cookie-name'];

        let cookie_secure = configOptionIsTrue('user-preference-cookie-secure');

        let cookie_expiry_days = 365;
        if (configOptionIsNumeric('user-preference-cookie-expiry-days')) {
            cookie_expiry_days = options['user-preference-cookie-expiry-days'];
        }

        const date = new Date();
        date.setTime(date.getTime() + (cookie_expiry_days * 24 * 60 * 60 * 1000));
        const expires = "expires="+date.toUTCString();
        let cookie_raw = cookie_name + "=" + encodeURIComponent(cookie_value) + ";" + expires + ";path=/";
        if (cookie_secure) {
            cookie_raw += ";secure";
        }
        document.cookie = cookie_raw;
    };

    const findAndBindPreferencesForm = function() {

        if (!configOptionIsString('user-preference-configuration-form-id')
        ) {
            console.debug("Skipping binding to user cookie preference form.");
            return;
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                findAndBindPreferencesForm();
            });
            console.debug("DOM is not ready; adding event to bind to form when ready.");
            return;
        }

        const theForm = getForm();
        if (theForm === null) {
            return;
        }
        theForm.addEventListener('submit', function (e) {
            savePreferencesFromForm(e);
            manageCookies();
            checkShouldCookieBannerBeVisible();
        });
        console.debug(`Found and bound to cookie preference form with ID "${options['user-preference-configuration-form-id']}".`);
        setPreferencesInForm();
    };

    const getForm = function () {
        return document.getElementById(options["user-preference-configuration-form-id"]);
    };

    const setPreferencesInForm = function () {
        if (configOptionIsFalse('set-checkboxes-in-preference-form')) {
            console.log("Skipping set preferences in form");
            return;
        }

        const theForm = getForm();
        if (theForm === null) {
            return;
        }
        const userPreferences = getUserPreferences();

        for (const category in userPreferences)
        {
            let checkBoxes = theForm.querySelectorAll('input[name="'+category+'"]');
            for (let n = 0; n < checkBoxes.length; n++){
                if (userPreferences.hasOwnProperty(category)) {
                    checkBoxes[n].checked = checkBoxes[n].value === userPreferences[category];
                }
            }
        }
    };

    const savePreferencesFromForm = function (event) {
        event.preventDefault();

        console.debug('Saving user cookie preferences from Form...');

        const theForm = document.getElementById(options["user-preference-configuration-form-id"]);
        const radioInputs = theForm.querySelectorAll('input[type="radio"]:checked');

        const categories = {};

        for (var i = 0; i < radioInputs.length; i++) {
            const node = radioInputs.item(i);
            const attr_name = node.getAttribute('name');
            const attr_value = node.getAttribute('value');
            console.log(`Processing Radio: ${attr_name} = ${attr_value})}`, i);
            categories[node.getAttribute('name')] = node.getAttribute('value');
        }

        savePreferences(categories);

        if (options['user-preference-saved-callback'] !== false && typeof options['user-preference-saved-callback'] === 'function') {
            options['user-preference-saved-callback']();
        }

    };

    const savePreferencesFromCookieBanner = function (event, preference) {
        event.preventDefault();

        console.debug('Setting user cookie preferences from Cookie Banner ('+preference+')...');

        const categories = {};

        for (let i = 0; i < options['cookie-manifest'].length; i++) {
            const category = options['cookie-manifest'][i];
            if (category['optional']) {
                categories[category['category-name']] = preference;
            }
        }

        savePreferences(categories);

        if (options['cookie-banner-saved-callback'] !== false && typeof options['cookie-banner-saved-callback'] === 'function') {
            options['cookie-banner-saved-callback']();
        }
    };

    const savePreferencesFromCookieBannerAcceptAll = function (event) {
        savePreferencesFromCookieBanner(event, 'on');
    };

    const savePreferencesFromCookieBannerRejectAll = function (event) {
        savePreferencesFromCookieBanner(event, 'off');
    };

    const savePreferences = function(user_cookie_preferences) {
        setCookie(JSON.stringify(user_cookie_preferences));
        console.debug('Saved user cookie preferences to cookie', getCookie(options['user-preference-cookie-name']));
    };

    const addAcceptAllListener = function (acceptAllButton) {
        if (acceptAllButton !== null) {
            acceptAllButton.addEventListener('click', function (e) {
                savePreferencesFromCookieBannerAcceptAll(e);
                manageCookies();
                checkShouldCookieBannerBeVisible();
            });
        }
    };

    const addRejectAllListener = function (rejectAllButton) {
        if (rejectAllButton !== null) {
            rejectAllButton.addEventListener('click', function (e) {
                savePreferencesFromCookieBannerRejectAll(e);
                manageCookies();
                checkShouldCookieBannerBeVisible();
            });
        }
    };

    const findAndBindCookieBanner = function () {
        if (!configOptionIsString('cookie-banner-id')
            && !configOptionIsString('cookie-banner-visibility-class')
        ) {
            console.debug('Skipping binding to cookie banner as both cookie-banner-id and cookie-banner-visibility-class are not defined');
            return;
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                findAndBindCookieBanner();
            });
            console.debug('DOM is not ready; adding event to bind to cookie banner when ready.');
            return;
        }

        const theBanner = document.getElementById(options['cookie-banner-id']);
        if (theBanner !== null) {
            const cookieButtons = theBanner.querySelectorAll('button');
            for (let i = 0; i < cookieButtons.length; i++) {
                let button = cookieButtons[i];
                if (button.value === "reject") {
                    addRejectAllListener(button);
                    console.debug("Found and bound reject all button");
                } else if (button.value === "accept" || button.type === "submit") {
                    addAcceptAllListener(button);
                    console.debug("Found and bound accept all button");
                }
            }

            console.debug(`Found and bound to cookie banner with ID "${options['cookie-banner-id']}".`);
            checkShouldCookieBannerBeVisible();
        }
    };

    const checkShouldCookieBannerBeVisible = function() {

        const theBanner = document.getElementById(options['cookie-banner-id']);
        const bannerVisibilityClass = options['cookie-banner-visibility-class'];
        if (theBanner === null || bannerVisibilityClass === null) {
            console.error('Cannot work with cookie banner unless cookie-banner-id and cookie-banner-visibility-class are configured.');
            return;
        }

        const user_preference_form = document.getElementById(options['user-preference-configuration-form-id']);
        const visible_on_preference_page = options['cookie-banner-visible-on-page-with-preference-form'];

        const cm_cookie = options['user-preference-cookie-name'];
        if (getUserPreferences(cm_cookie)) {
            // User has preferences set, no need to show cookie banner.
            if (!theBanner.classList.contains(bannerVisibilityClass)) {
                theBanner.classList.add(bannerVisibilityClass);
                console.debug('Cookie banner was set to visible.')
            }
        } else {
            if (user_preference_form !== null && visible_on_preference_page === false) {
                theBanner.classList.add(bannerVisibilityClass);
            } else {
                theBanner.classList.remove(bannerVisibilityClass);
                console.debug('Cookie banner was set to visible.');
            }
        }


    };

    const configOptionIsTrue = function (optionName) {
        return options.hasOwnProperty(optionName) && options[optionName] === true;
    };

    const configOptionIsFalse = function (optionName) {
        if (options.hasOwnProperty(optionName)) {
            return options[optionName] === false;
        }
        return true;
    };

    const configOptionIsNumeric = function (optionName) {
        return options.hasOwnProperty(optionName)
            && !isNaN(options[optionName]);
    };

    const configOptionIsString = function (optionName) {
        return options.hasOwnProperty(optionName)
            && typeof options[optionName] === 'string'
            && options[optionName].trim() !== '';
    };

    const configOptionIsNotEmptyObject = function (optionName) {
        return options.hasOwnProperty(optionName)
            && typeof options[optionName] === 'object'
            && options[optionName].length > 0;
    };

    exports.init = init;

})));
