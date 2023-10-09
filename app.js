import { CONSTANTS } from "./constants.js";
import { ArrayHelper } from "./utilities/ArrayHelper.js";
import { ObjectHelper } from "./utilities/ObjectHelper.js";

// HTML elelment defined here.
const startDateTimeInputElement = document.getElementById("startDateTime");
const endDateTimeInputElement = document.getElementById("endDateTime");
const loadButtonElement = document.getElementById("load");
const chartCanvesElement = document.getElementById('chart');

// Constant
const DateTime = luxon.DateTime;

// Global variables.
let productStandardUnitRates = null;
let consumptionData = null;
let chart = null;
let chartDataSource = [];

// Function defined here.

function getConsumptions(mpan, serialNumber, startDateTime = new Date(), endDateTime = new Date(), page = 1, results = []) {
    const requestUrl = generateElectricityMeterConsumptionUrl(mpan, serialNumber, startDateTime, endDateTime, page);
    const _http = createDefaultXMLHttpRequest("GET", requestUrl);
    _http.onreadystatechange = function() {
        if(_http.readyState === XMLHttpRequest.DONE) {
            if(_http.status === 200) {
                const respons = JSON.parse(_http.response);
                if(!ObjectHelper.isNullOrUndefined(respons?.next)) {
                    results.push(...respons.results);
                    page = page + 1;
                    getConsumptions(mpan, serialNumber, startDateTime, endDateTime, page, results);
                } else {
                    console.log(`consumption loaded. Number of records: ${results.length}`);
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

function getProductStandardUnitRates(productCode, trafficCode, startDateTime = new Date(), endDateTime = new Date(), page = 1, results = []) {
    const requestUrl = generateElectricityProductStandardUnitRatesUrl(productCode, trafficCode, startDateTime, endDateTime, page);
    const _http = createDefaultXMLHttpRequest("GET", requestUrl);
    _http.onreadystatechange = function() {
        if(_http.readyState === XMLHttpRequest.DONE) {
            if(_http.status === 200) {
                const respons = JSON.parse(_http.response);
                if(!ObjectHelper.isNullOrUndefined(respons?.next)) {
                    results.push(...respons.results);
                    page = page + 1;
                    getProductStandardUnitRates(productCode, trafficCode, startDateTime, endDateTime, page, results);
                } else {
                    console.log(`product standard unit rate loaded. Number of records: ${results.length}`);
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

function createDefaultXMLHttpRequest(method, requestUrl) {
    const http = new XMLHttpRequest();
    http.open(method, requestUrl, true);
    http.setRequestHeader("Accept", "application/json");
    http.setRequestHeader("authorization", `Basic ${generateEncodedApiKey(CONSTANTS.octopus.apiKey)}`);
    return http;
}

function generateElectricityMeterConsumptionUrl(mpan, serialNumber, startDateTime, endDateTime, page) {
    return `${CONSTANTS.octopus.root}/v1/electricity-meter-points/${mpan}/meters/${serialNumber}/consumption/?page=${page}&period_from=${startDateTime}&period_to=${endDateTime}`;
}

function generateElectricityProductStandardUnitRatesUrl(productCode, trafficCode, startDateTime, endDateTime, page) {
    return `${CONSTANTS.octopus.root}/v1/products/${productCode}/electricity-tariffs/${trafficCode}/standard-unit-rates/?page=${page}&period_from=${startDateTime}&period_to=${endDateTime}`;
}

function generateEncodedApiKey(apiKey) {
    return btoa(apiKey+":");
}


function renderChart() {
    if(ObjectHelper.isNullOrUndefined(chartDataSource)) {
        console.log("Empty found in chart data.");
        return;
    }
    chartDataSource.sort((a, b) => new Date(a.endDateTime) - new Date(b.endDateTime));
    const chartData = {
        datasets: [{
            type: "line",
            label: "Consumptions (kw/h)",
            data: chartDataSource.map(o=>o.consumption),
            yAxisID: "kw"
        },{
           type: "bar",
           label: "Price (GBP Include VAT)",
           data: chartDataSource.map(o=>o.valueIncludeVat),
           yAxisID: "price"
        }],
        // labels: chartDataSource
        //     .map(o=> DateTime.fromISO(o.startDateTime).toFormat("yyyy-LL-dd HH:mm"))
        labels: renderChartLabel(chartDataSource)
    };
    return new Chart(chartCanvesElement, {
        data: chartData,
        options: {
            scales: {
                price: {
                    type: "linear",
                    position: "left",
                    beginAtZero: true,
                    // ticks: {
                    //     min: -10
                    // }
                },
                kw: {
                    type: "linear",
                    position: "right",
                    beginAtZero: true,
                    // ticks: {
                    //     min: -10
                    // }
                }
            }
        }
    });
}

function renderChartLabel(chartDataSource) {
    const label = [];
    let index = 0;
    let currentDate = DateTime.fromISO(chartDataSource[index].startDateTime).toFormat("yyyy-LL-dd");
    do {
        let format = "HH:mm";
        if(index === 0 || currentDate !== DateTime.fromISO(chartDataSource[index].startDateTime).toFormat("yyyy-LL-dd")) {
            format = "yyyy-LL-dd HH:mm";
            currentDate = DateTime.fromISO(chartDataSource[index].startDateTime).toFormat("yyyy-LL-dd");
        }
        label.push(DateTime.fromISO(chartDataSource[index].startDateTime).toFormat(format));
        index++;
    } while(index!=chartDataSource.length);
    return label;
}

function resetUI() {
    const endDate = DateTime.now();
    endDateTimeInputElement.value = endDate.toFormat("yyyy-LL-dd'T'HH:mm");
    const startDate = endDate.minus({week: 1});
    startDateTimeInputElement.value =  startDate.toFormat("yyyy-LL-dd'T'HH:mm");
}

function resetData() {
    const electricityMeter = CONSTANTS.octopus.meters.filter(function(item) {
        return item.type === "ELECTRICITY";
    })[0];
    getConsumptions(electricityMeter.mpan, electricityMeter.serialNumber, startDateTimeInputElement.value, endDateTimeInputElement.value);
}

// Event listener defined here.
window.addEventListener("resize", function(event) {
    console.debug("window resized.");
    if(ObjectHelper.isNullOrUndefined(chart)) {
        const context = chartCanvesElement.getContext("2D");
        // context.width = this.window.innerWidth;
        // context.height = this.window.innerHeight;
        chart.resize(chartCanvesElement.parentElement.offsetWidth, chartCanvesElement.parentElement.offsetHeight-200);
        chart.update();
    }
})

document.addEventListener("DOMContentLoaded", function() {
    resetUI();
    resetData();
});

document.addEventListener("consumptionsCollected", function(event) {
    const collectedData = event.detail.results;
    collectedData.forEach(function(value) {
        const start = new Date(value.interval_start).toISOString();
        const end = new Date(value.interval_end).toISOString();
        const target = chartDataSource.filter(o=>o?.startDateTime == start && o?.endDateTime === end);
        if(ArrayHelper.isEmpty(target)) {
            chartDataSource.push({
                startDateTime : start,
                endDateTime: end,
                consumption: value.consumption
            });
        } else {
            target[0].consumption = value.consumption;
        }
    });
    const electricityProduct = CONSTANTS.octopus.products.filter(function(item) {
        return item.type === "ELECTRICITY";
    })[0];
    getProductStandardUnitRates(electricityProduct.productCode, electricityProduct.trafficCode, startDateTimeInputElement.value, endDateTimeInputElement.value);
});

document.addEventListener("productStandardUnitRatesCollected", function(event) {
    const collectedData = event.detail.results;
    collectedData.forEach(function(value) {
        const start = new Date(value.valid_from).toISOString();
        const end = new Date(value.valid_to).toISOString();
        const target = chartDataSource.filter(o=>o?.startDateTime == start && o?.endDateTime === end);
        if(ArrayHelper.isEmpty(target)) {
            chartDataSource.push({
                startDateTime : start,
                endDateTime: end,
                valueIncludeVat: value.value_inc_vat
            });
        } else {
            target[0].valueIncludeVat = value.value_inc_vat;
        }
    });
    console.log(chartDataSource);
    if(chart) {
        chart.destroy();
    }
    chart = renderChart();
});

startDateTimeInputElement.addEventListener("input", function(event) {
    console.log("startDate changed");
    endDateTimeInputElement.min = event.detail.value;
});

endDateTimeInputElement.addEventListener("input", function(event) {
    console.log("endDate changed");
});

loadButtonElement.addEventListener("click", function(event) {
    resetData();
})