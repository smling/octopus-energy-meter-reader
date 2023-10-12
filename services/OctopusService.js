import { ObjectHelper } from "../utilities/ObjectHelper.js";

export default class OctopusService {
    constructor(rootUrl, apiKey) {
        this.rootUrl = rootUrl;
        this.apiKey = apiKey;
    }

    getConsumptions(mpan, serialNumber, startDateTime = new Date(), endDateTime = new Date(), page = 1, results = []) {
        const requestUrl = this.generateElectricityMeterConsumptionUrl(mpan, serialNumber, startDateTime, endDateTime, page);
        console.debug(`requestUrl: ${requestUrl}`);
        const _http = this.createDefaultXMLHttpRequest("GET", requestUrl);
        _http.onreadystatechange = () => {
            if(_http.readyState === XMLHttpRequest.DONE) {
                if(_http.status === 200) {
                    const respons = JSON.parse(_http.response);
                    console.debug(`next API call: ${respons?.next}`);
                    results.push(...respons?.results);
                    page = page + 1;
                    if(!ObjectHelper.isNullOrUndefined(respons?.next)) {
                        this.getConsumptions(mpan, serialNumber, startDateTime, endDateTime, page, results);
                    } else {
                        console.log(`consumption loaded. Number of records: ${results.length};`);
                        console.debug(results);
                        const consumptionCollected = new CustomEvent("consumptionsCollected", {detail: {
                            results: results
                        }});
                        document.dispatchEvent(consumptionCollected);
                    }
                }
            }
        };
        _http.send();
    }
    
    getProductStandardUnitRates(productCode, trafficCode, startDateTime = new Date(), endDateTime = new Date(), page = 1, results = []) {
        const requestUrl = this.generateElectricityProductStandardUnitRatesUrl(productCode, trafficCode, startDateTime, endDateTime, page);
        console.debug(`requestUrl: ${requestUrl}`);
        const _http = this.createDefaultXMLHttpRequest("GET", requestUrl);
        _http.onreadystatechange = () => {
            if(_http.readyState === XMLHttpRequest.DONE) {
                if(_http.status === 200) {
                    const respons = JSON.parse(_http.response);
                    console.debug(`next API call: ${respons?.next}`);
                    results.push(...respons?.results);
                    page = page + 1;
                    if(!ObjectHelper.isNullOrUndefined(respons?.next)) {
                        this.getProductStandardUnitRates(productCode, trafficCode, startDateTime, endDateTime, page, results);
                    } else {
                        console.log(`product standard unit rate loaded. Number of records: ${results.length};`);
                        console.debug(results);
                        const consumptionCollected = new CustomEvent("productStandardUnitRatesCollected", {detail: {
                            results: results
                        }});
                        document.dispatchEvent(consumptionCollected);
                    }
                }
            }
        };
        _http.send();
    }
    
    createDefaultXMLHttpRequest(method, requestUrl) {
        const http = new XMLHttpRequest();
        http.open(method, requestUrl, true);
        http.setRequestHeader("Accept", "application/json");
        http.setRequestHeader("authorization", `Basic ${this.generateEncodedApiKey(this.apiKey)}`);
        return http;
    }
    
    generateElectricityMeterConsumptionUrl(mpan, serialNumber, startDateTime, endDateTime, page) {
        return `${this.rootUrl}/v1/electricity-meter-points/${mpan}/meters/${serialNumber}/consumption/?page=${page}&period_from=${startDateTime}&period_to=${endDateTime}`;
    }
    
    generateElectricityProductStandardUnitRatesUrl(productCode, trafficCode, startDateTime, endDateTime, page) {
        return `${this.rootUrl}/v1/products/${productCode}/electricity-tariffs/${trafficCode}/standard-unit-rates/?page=${page}&period_from=${startDateTime}&period_to=${endDateTime}`;
    }
    
    generateEncodedApiKey(apiKey) {
        return btoa(apiKey+":");
    }
}