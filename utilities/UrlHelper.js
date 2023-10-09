export const UrlHelper = {
    getUrlParameterValue : function(parameter) {
        const urlParameters = new URLSearchParams(window.location.search);
        return urlParameters.get(parameter);
    }
}