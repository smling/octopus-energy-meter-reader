import { CONSTANTS } from "./constants.js";
import OctopusService from "./services/OctopusService.js";
import { ArrayHelper } from "./utilities/ArrayHelper.js";
import { ObjectHelper } from "./utilities/ObjectHelper.js";

// HTML elelment defined here.
const startDateTimeInputElement = document.getElementById("startDateTime");
const endDateTimeInputElement = document.getElementById("endDateTime");
const loadButtonElement = document.getElementById("load");
const chartCanvesElement = document.getElementById("chart");
const searchCriteriaWindowElement = document.getElementById("searchCriteriaWindow");

// Constant
const DateTime = luxon.DateTime;
const octopusService = new OctopusService(CONSTANTS.octopus.root, CONSTANTS.octopus.apiKey);

// Global variables.
let chart = null;
let chartDataSource = [];


let isDragging = false;
let offsetX, offsetY;

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
        labels: renderChartLabel(chartDataSource)
    };
    return new Chart(chartCanvesElement, {
        data: chartData,
        options: {
            scales: {
                price: {
                    type: "linear",
                    position: "left",
                    beginAtZero: true
                },
                kw: {
                    type: "linear",
                    position: "right",
                    beginAtZero: true
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
    const endDate = DateTime.now().plus({day:1});
    endDateTimeInputElement.value = endDate.toFormat("yyyy-LL-dd'T'HH:mm");
    const startDate = endDate.minus({week: 1});
    startDateTimeInputElement.value =  startDate.toFormat("yyyy-LL-dd'T'HH:mm");
}

function resetData() {
    chartDataSource = [];
    const electricityMeter = CONSTANTS.octopus.meters.filter(function(item) {
        return item.type === "ELECTRICITY";
    })[0];
    octopusService.getConsumptions(electricityMeter.mpan, electricityMeter.serialNumber, startDateTimeInputElement.value, endDateTimeInputElement.value);
}

// Event listener defined here.
window.addEventListener("resize", function(event) {
    console.debug("window resized.");
    if(!ObjectHelper.isNullOrUndefined(chart)) {
        chart.resize(this.window.innerWidth, this.window.innerHeight - 200);
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
    octopusService.getProductStandardUnitRates(electricityProduct.productCode, electricityProduct.trafficCode, startDateTimeInputElement.value, endDateTimeInputElement.value);
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
    endDateTimeInputElement.min = event.currentTarget.value;
});

endDateTimeInputElement.addEventListener("input", function(event) {
    console.log("endDate changed");
});

loadButtonElement.addEventListener("click", function(event) {
    resetData();
})

searchCriteriaWindowElement.addEventListener('mousedown', (e) => {
    console.log("mouseDown event hit");
    isDragging = true;
    offsetX = e.clientX - searchCriteriaWindowElement.getBoundingClientRect().left;
    offsetY = e.clientY - searchCriteriaWindowElement.getBoundingClientRect().top;
    searchCriteriaWindowElement.style.cursor = 'grabbing';
  });

document.addEventListener('mousemove', (e) => {
    if (isDragging) {
        searchCriteriaWindowElement.style.left = e.clientX - offsetX + 'px';
        searchCriteriaWindowElement.style.top = e.clientY - offsetY + 'px';
    }
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
    searchCriteriaWindowElement.style.cursor = 'grab';
  });