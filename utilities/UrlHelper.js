import { Base64Serializer } from "./Base64Serializer.js";
import { ObjectHelper } from "./ObjectHelper.js";

export const UrlHelper = {
    getUrlParameterValue : function(parameter) {
        const urlParameters = new URLSearchParams(window.location.search);
        return urlParameters.get(parameter);
    },
    getDeserializedUrlParameterValue: function(parameter) {
        const parameterValue = this.getUrlParameterValue(parameter);
        if(ObjectHelper.isNullOrUndefined(parameterValue)) {
            throw new Error(`Parameter ${parameter} could not be found.`);
        }
        return Base64Serializer.deserialize(parameterValue);
    }
}