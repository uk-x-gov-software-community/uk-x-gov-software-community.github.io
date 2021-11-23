(function(){
    var cookies;

    function readCookie(name,c,C,i){
        if(cookies){ return cookies[name]; }

        c = document.cookie.split('; ');
        cookies = {};

        for(i=c.length-1; i>=0; i--){
           C = c[i].split('=');
           cookies[C[0]] = C[1];
        }

        return cookies[name];
    }
    
    function cookiePreferencesExists(name){
        var regex = /^(.*;)?s*cm-user-preferences*=s*[^;]+(.*)?$/;
        return document.cookie.match(regex);
    }

    window.readCookie = readCookie;
    window.cookieExists = cookiePreferencesExists;
})();
var analyticsManager = (function() {
    
    return function() {
        var analytics = {analytics:"off"};
        if(cookieExists()){
            analytics = JSON.parse(decodeURIComponent(readCookie('cm-user-preferences')));
            if(analytics['analytics'] === "on"){
                console.log("loading google analytics");
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-V3PQ58K3S0');
                            
            }
            else {
                console.log("not loading google analytics");
            }
        }
        
        
    };
})();

analyticsManager();