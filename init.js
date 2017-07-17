class App {
    
    constructor() {
        this.token = 'Bearer ' + '5ed44afcfcf9f20ee7498bd535d09ce48f1425a088eed699fa5818086378'
        this.acceptedCustomers = [669, 345, 9, 537, 81]
        
        this.userUrl = 'https://portal-rumlive.rum.nccgroup-webperf.com/authorisation/user?service=8&u=cb86b7590b'
        
        this.reportService = 'https://portal-rumlive.rum.nccgroup-webperf.com/reports/rum/1/'
        
        this.defaultFilterList = {
            browser: '',
            os: '',
            interval: '3600',
            navtiming: 'lnd',
            percentile: '50',
            period: this.getPeriod('07-15-2017 00:00:00', '07-15-2017 23:59:59')
        }
        
        this.init()
    }
    
    init() {
        this.getUserData().then(() => {
            this.createStore()
            this.makeReport('loadspeedpercentile')
        })
    }
    
    getPeriod(startDate, endDate) {
        
        let parsedStartDate = new Date(startDate).getTime() / 1000
        let parsedEndDate = new Date(endDate).getTime() / 1000
        
        return parsedStartDate + '_' + parsedEndDate
    }
    
    createStore() {
        this.store = Object.keys(this.userData.realms).map(realm => {
            return {
                realm: realm,
                name: this.userData.realms[realm].label,
                customer_id: this.userData.realms[realm].customer,
                filters: this.defaultFilterList
            }
        }).filter(realm => {
            return this.acceptedCustomers.indexOf(parseInt(realm.customer_id)) >= 0
        })
    }
    
    getUserData() {
        return this.fetchData(this.userUrl).then(response => {
            return response.json()
        }).then(json => {
            this.userData = json
        })
    }
    
    getReportData(customer, reportName) {
        let params = ''

        Object.keys(customer.filters).map(filterName => {
            customer.filters[filterName] !== '' ? params += filterName + '=' + customer.filters[filterName] + '&' : false
        })

        let requestUrl = this.reportService + reportName + '?' + params

        return this.fetchData(requestUrl, customer.realm).then(response => {
            return response.json()
        })
    }
    
    fetchData(url, realm) {
        return fetch(url, {
            method: 'GET',
            mode: 'cors',
            headers: new Headers({
                Authorization: this.token,
                Realm : realm
            })
        })
    }
    
    makeReport(reportName) {
        let count = 0
        
        this.store.map((customer, index) => {
            return this.getReportData(customer, reportName).then(json => {
                customer[reportName] = json
                count === this.store.length - 1 ? this.drowData(this.store, reportName) : count++
            })
        })
    }
    
    drowData(store, reportName) {
        let title = ''
        let dataLabel = ''
        let series = ''
        let chartSettings = ''
        
        switch(reportName) {
            case 'loadspeedpercentile':
                title = 'Page Load Time'
                dataLabel = 'Page Load Duration'
                
                series = store.map(customer => {
                    let data = customer.loadspeedpercentile.chart[0].data.map(moment => { return [moment.x, moment.y] })
                    
                    return {
                        name: customer.name,
                        data: data
                    }
                })
                
                chartSettings = {
                    chart: {
                        zoomType: 'x'
                    },
                    title: {
                        text: title
                    },
                    xAxis: {
                        type: 'datetime',
                        crosshair: true,
                        events: {
                            afterSetExtremes: event => {
                                console.log(Math.floor(event.userMin), Math.ceil(event.userMax))
                            }
                        }
                    },
                    yAxis: {
                        title: {
                            text: dataLabel
                        }
                    },
                    legend: {
                        layout: 'vertical',
                        align: 'right',
                        verticalAlign: 'middle'
                    },
                    series: series
                }
                
                break
        }
        
        this.buildReport(chartSettings)
    }
    
    buildReport(chartSettings) {
        Highcharts.chart('container', chartSettings)
    }
}

let app = new App()