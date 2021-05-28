export const sourceDataFilter = (type, number, salesData, startTime, endTime, isPayment) => {

  // 初始化数据   
  const sourceData = [[], [], []]

  let myDate = new Date();
  let year = myDate.getFullYear()
  let month = myDate.getMonth()


  // 转换数据结构：月份作为索引
  const fomatedMonthlySalesData = {}

  if(salesData){
    for(let i=0; i<salesData.length; i++){
      let element = salesData[i]
      fomatedMonthlySalesData[`${element.invoiceYear}-${element.invoiceMonth}`] = {
        invoiceYear: element.invoiceYear,
        totalInclGst: element.totalInclGst,
        profitInclGst: element.profitInclGst,
        invoiceQuantity: element.invoiceQuantity,
      }
    }
  }

  // 全部时间的支付
  if (type === 'Data with All Date') {
    if (number > 5) {
      for (let i = 0; i < number; i++) {
        let element = salesData && salesData[i] 
        sourceData[0].push({
            x: salesData && salesData[i] && salesData[i].paymentModeName || "",
            y: salesData && salesData[i] && salesData[i].amountInclGst || 0
          });
      }
    } else {
      for (let i = 0; i < 5; i++) {
        let element = salesData && salesData[i] 
        if(salesData && salesData[i]){
          sourceData[0].push({
            x: salesData && salesData[i] && salesData[i].paymentModeName || "",
            y: salesData && salesData[i] && salesData[i].amountInclGst || 0
          });
        }
      }

    }
  }
  // 今日时间的支付
  if (type === 'Data with Query') {
    if (number > 5) {
      for (let i = 0; i < number; i++) {
        let element = salesData && salesData[i] 
        sourceData[0].push({
            x: salesData && salesData[i] && salesData[i].paymentModeName || "",
            y: salesData && salesData[i] && salesData[i].amountInclGst || 0
          });
      }
    } else {


      for (let i = 0; i < 5; i++) {
        let element = salesData && salesData[i] 
        if(salesData && salesData[i]){
          sourceData[0].push({
            x: salesData && salesData[i] && salesData[i].paymentModeName || "空",
            y: salesData && salesData[i] && salesData[i].amountInclGst || 0
          });
        } else {
          sourceData[0].push({
            x: "",
            y: 0
          });
        }
      }

    }
  }
  return sourceData
}