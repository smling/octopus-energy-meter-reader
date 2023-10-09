import { ObjectHelper } from "./ObjectHelper.js"

export const ArrayHelper = {
    isEmpty : function(value) {
        if( (ObjectHelper.isNullOrUndefined(value)) || 
            !(value instanceof Array)) {
            return true;
        }
        return (!value.length > 0)
    }
}