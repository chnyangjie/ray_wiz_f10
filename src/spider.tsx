import axios from 'axios'
import { parse } from 'node-html-parser';
import dateFormat, { masks } from "dateformat";
import { Report } from './domain';

let config = JSON.parse('[{"报表日期":"bbjzr"},{"财报类型":"cblx"},{"年结日":"njr"},{"币种":"bz"},{"收入":null},{"主营收入":"zysr"},{"其他业务收入":"qtywsr"},{"营业收入":"yysr"},{"成本":null},{"主营成本":"zycb"},{"其他业务成本":"qtywcb"},{"营业成本":"yycb"},{"毛利其他项目":"mlqtxm"},{"毛利":"ml"},{"经营费用":null},{"研发费用":"yffy"},{"营销费用":"yxfy"},{"一般及行政费用":"ybjxzfy"},{"折旧与摊销":"zjytx"},{"减值及拨备":"jzjbb"},{"其他营业费用":"qtyyfy"},{"重组费用":"czfy"},{"营业费用":"yyfy"},{"其他收益":"qtsy"},{"营业利润":"yylr"},{"税前溢利":null},{"利息收入":"lxsr"},{"利息支出":"lxzc"},{"权益性投资损益":"qyxtzsy"},{"投资性减值准备":"tzxjzzb"},{"其他收入(支出)":"qtsrzc"},{"公允价值变动损益":"gyjjbdsy"},{"汇兑损益":"hdsy"},{"资产处理损益":"zcclsy"},{"融资收入(支出)":"rzsrzc"},{"税前利润其他项目":"sqlrqtxm"},{"持续经营税前利润":"cxjysqlr"},{"所得税":"sds"},{"持续经营净利润":"cxjyjlr"},{"已终止或非持续经营净利润":"yzzhfcxjyjlr"},{"税后利润其他项目":"shlrqtxm"},{"净利润":"jlr"},{"股东应占溢利":null},{"少数股东损益":"ssgdsy"},{"归属于优先股净利润及其他项":"gsyyxgjlrjqtx"},{"归属于普通股股东净利润":"gsyptggdjlr"},{"股东应占溢利其他项目":"gdyzylqtxm"},{"归属于母公司股东净利润":"gsymgsgdjlr"},{"每股指标":null},{"普通股股息":"ptggx"},{"每股股息-普通股":"mggxptg"},{"基本每股收益-普通股":"jbmgsyptg"},{"摊薄每股收益-普通股":"tbmgsyptg"},{"基本每股收益-ADS":"jbmgsyads"},{"摊薄每股收益-ADS":"tbmgsyads"},{"全面收益":null},{"本公司拥有人占全面收益总额":"bgsyyrzqmsyze"},{"非控股权益占全面收益总额":"fkgqyzqmsyze"},{"其他全面收益其他项目":"qtqmsyqtxm"},{"其他全面收益合计项":"qtqmsyhjx"},{"全面收益其他项目":"qmsyqtxm"},{"全面收益总额":"qmsyze"},{"会计准则":"kjzz"}]')
export async function getStockList(symbol: string) {
    return axios.get(`http://emweb.eastmoney.com/pc_usf10/CoreReading/index?code=${symbol}`)
        .then(res => {
            let dom = parse(res.data).querySelector("#global_fullcode")
            if (dom) {
                return dom.getAttribute("value")
            }
            else {
                return null
            }
        }).catch(err => {
            console.log(err)
            return null
        })
}

async function queryMainProfit(fullCode: string, date: string) {
    return axios({
        "method": "GET",
        "url": "http://emweb.eastmoney.com/PC_USF10/CompanyInfo/GetZYGC_ByDate",
        "params": {
            "fullCode": fullCode,
            "date": date
        }
    }).then(res => {
        return res.data.data.zygc_cp
    }).catch(err => {
        return []
    })
}

async function queryIncomeStatement(fullCode: string) {
    return axios({
        "method": "GET",
        "url": "http://emweb.eastmoney.com/pc_usf10/FinancialAnalysis/GetLRB",
        "params": {
            "SecurityCode": fullCode,
            "ReportDateType": "1",
            "StatisType": "1",
            "CompanyType": "4",
            "StartIndex": "0"
        }
    }).then(res => {
        let report_list = res.data.lrb_qt
        let result: Report[] = []
        report_list.forEach((reportR: object, index: number) => {
            let report = new Map(Object.entries(reportR))
            let date = report.get("bbjzr")
            let year = new Date(Date.parse(date)).getFullYear().toString()
            let type = report.get("cblx")
            let dataList: string[][] = []
            let thisYear = { "data": dataList, "year": year, "type": type, "symbol": fullCode, "date": date, "profit": []}

            config.forEach((kvR: object) => {
                let kv = new Map(Object.entries(kvR))
                kv.forEach((v: string, k: string) => {
                    let value: string | null
                    if (v) {
                        value = report.get(v)
                        if (!value) {
                            value = ""
                        }
                    }
                    else {
                        value = ""
                    }
                    thisYear.data.push([k, value, v])
                })
            })
            result.push(thisYear)
        })
        return result
    })
        .catch(err => {
            console.log(err)
            return []
        })
}

export async function getIncomeStatement(fullCode: string) {
    let statement = await queryIncomeStatement(fullCode)
    return Promise.all(statement.map((item: Report) => {
        return queryMainProfit(item.symbol, item.date).then(res => {
            item.profit = res.map((dataR:object)=>{
                let data = new Map(Object.entries(dataR))
                return {"item":data.get("PRODUCTNAME"), "value": data.get("MBREVENUE"), "ratio": data.get("RATIO")}
            })
            return item
        })
    }))
}