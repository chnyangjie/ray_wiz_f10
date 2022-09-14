import { ActionPanel, Detail, List, Action } from "@raycast/api";
import { useEffect, useState } from 'react'
import { Report, CompanyInfo } from "./domain";
import { getStockList, getIncomeStatement } from './spider'

export default function Command() {
  const [symbol, setSymbol] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [statementList, setStatementList] = useState<Report[]>([])
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>()
  let fetchData = async () => {
    setIsLoading(true)
    if (symbol) {
      let ci = await getStockList(symbol)
      if (ci) {
        setCompanyInfo(ci)
        let incomeStatement = await getIncomeStatement(ci.fullCode)
        setStatementList(incomeStatement)
      }
      else {
        setStatementList([])
      }
    }
    setIsLoading(false)
  }
  let toTable = (item: Report): string => {
    let result: string[] = []
    if (companyInfo) {
      result = companyInfo.data.map((v: string[]) => {
        return v.join(" ")
      })
    }
    // let dataList = item.data
    // result.push("|key|value|")
    // result.push("|---|---|")
    // dataList.forEach((map) => {
    //   result.push(`|${map[0]} | ${map[1]}|`)
    // })
    if (item.profit) {
      item.profit.forEach(item => {
        result.push(`* ${item.item} ${item.value}\n`)
      })
    }
    return result.join("\n\n")
  }
  useEffect(() => {
    let f = fetchData()
  }, [symbol])
  let search = (symbol: string) => {
    setIsLoading(true)
    fetchData()
    setSymbol(symbol)
    setIsLoading(false)
  }
  let formatNumber = (value: string) => {
    // if the value is a number, then add thousand separator
    if (value.match(/^\d+$/)) {
      return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    }
    else {
      return value
    }
  }
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search for a US ticker"
      searchText={symbol}
      onSearchTextChange={(s) => search(s)}
      throttle={true}
      isShowingDetail={statementList.length > 0}
    >
      {(statementList.length == 0 && symbol && !isLoading) ? (<List.EmptyView icon={'Page Not Found.png'} />) : (statementList.map((item, index) => {
        return <List.Item
          key={index}
          title={item.year + item.type}
          accessories={[{ "text": item.symbol }]}
          detail={
            <List.Item.Detail
              markdown={toTable(item)}
              metadata={
                <List.Item.Detail.Metadata>
                  {item.data.map((pair, index) => {
                    let isLable = index < item.data.length - 1 && item.data[index + 1][1] === ""
                    let res = []
                    if (isLable) {
                      res.push(<List.Item.Detail.Metadata.Label key={index} title={pair[0]} text={formatNumber(pair[1])} />)
                      res.push(<List.Item.Detail.Metadata.Separator key={index + "sep"} />)
                    }
                    else {
                      res.push(<List.Item.Detail.Metadata.Label key={index} title={pair[0]} text={formatNumber(pair[1])} />)
                    }
                    return res
                  })}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" target={<Detail markdown="# Hey! 👋" />} />
            </ActionPanel>
          }
        />
      }))}
    </List>
  );
}
