export interface Report {
    symbol: string
    year: string
    type: string
    date: string
    data: string[][]
    profit: Profit[]
}

export interface Profit{
    item: string
    value: number
    ratio: number
}