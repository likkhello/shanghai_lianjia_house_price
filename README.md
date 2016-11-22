---
title: "README"
author: "likk"
output:
  html_document: default
  pdf_document:
    includes:
      in_header: header.tex
    latex_engine: xelatex
---

## 项目介绍
在人们衣食住行的日常生活中，房子无疑是人们最为关心的的事物之一。最近中国的房价经历了几轮上涨，高企的房价成为人们谈论最多的话题。
本项目使用全栈技术技术对上海房价做出数据分析和可视化展示，下面将通过数据爬起，数据分析，可视化三个方面介绍项目的实现过程，并在自定义阶段提出了以后的扩展改进方向。

## 1. 数据爬取
这里将上海链家网作为数据爬取来源，使用node.js编写爬虫代码，将数据存储到mongoDB中。链家网分为二手房，新房，租房，小区等不同板块，为了更好的反映出上海整体范围内的价格分布趋势，这 v 里选取小区板块作为主要数据来源。
下面开始介绍爬虫代码。代码分为4部分：lianjia_community.urls.js，lianjia_community.pool.js，lianjia_community.parser.js，lianjia_community.js。它们分别是目标URL产生模块，线程池管理模块，URL解析存储模块和顶层调用模块。

### 1.1 产生爬取的目标URL
首先根据上海各个行政区的划分产生目录页基址URL(例如http://sh.lianjia.com/xiaoqu/pudongxinqu/d1 )，再使用superagent和cheerio从基址URL解析出其子链接页面的URL，并且使用async模块控制异步处理的并发数，最后将结果存储到本地txt文件中。
```{r, eval=FALSE, message=FALSE}
  async.mapLimit(BaseUrls, 5, function (myurl, callback) {
          fetchUrl(myurl, callback);
      }, function (err, result) {
          fs.appendFile(__dirname + '/lianjia_community_SubUrls.txt', result[result.length-1], function () {
            console.log('========= SubUrls: ==========\n', result[result.length-1]);
          });
      });

```
这里fetchUrl是执行URL爬取解析的函数，异步处理的并发数设为5，result是用于存储所有子链接URL的数组，最后写入到txt文件中,这样的好处是在爬取页面较多且需要多次爬取时，这一步的结果可以在顶层模块中直接读取复用，而无需每次重新执行。

### 1.2 线程池管理
我们构建了一个简单的线程池管理模块，用于控制同时并发的线程数量和每两次爬取之间的时间间隔，防止过于频繁访问目标服务器而导致错误结果。
```{r, eval=FALSE,  message=FALSE}
  query: function(){
    if (this.queryingIndex > poolCount) return;
    var url = this.urls[this.spiderIndex];
    if(this.spiderIndex >= this.urls.length) return this.done();
    request.get(url, function(e, res, body){
      console.log(url);
      this.process(e, res, body);
    }.bind(this));
    this.spiderIndex = this.spiderIndex + 1;
    this.queryingIndex = this.queryingIndex + 1;
    if(this.queryingIndex < poolCount) this.query();
  }
  onProcessed: function(){
    this.queryingIndex--;
    setTimeout(function(){
      this.query();
    }.bind(this), timeout);
  }
```
这里有四个主要的参数：spiderIndex，queryingIndex，poolCount和timeout。spiderIndex是目标URL数组的指针，依次递增直到遍历完所有URL，queryingIndex是当前执行的进程数，它在执行请求函数(query)时加1，执行处理函数(onProcessed)时减1，始终保持在小于poolCount的范围内。poolCount是线程池大小。timeout用于控制两次请求之间的时间间隔。poolCount和timeout参数可调。

### 1.3 解析存储URL
这里主要通过分析页面的DOM结构推测出目标信息的jQuery获取表达式。以下图为例：
<img src="http://ogx7uv5qv.bkt.clouddn.com/dom_xiaoqu2.png" width="800px" height="300px" />

这里的小区均价可以通过$('.priceInfo').find('.p').text();得到，即在寻找priceInfo class下的p标签内的文本内容。其他小区的基本信息也可以通过类似的方式得到，再一起存储到MongoDB。
```{r, eval=FALSE,  message=FALSE}
    var result = {
      community_name: community_name,
      avr_price: avr_price,
      lat: lat,
      lng: lng,
      age: age,
      building_count: building_count,
      house_count: house_count
    };
    console.log(result)
    update(result);
    
function update(obj) {
  Mongo.community.findOneAndUpdate({
    community_name: obj.community_name
  }, obj, {
    upsert: true
  }, function(e, d) {
    console.log('Update successful...');
  });
}
```
为了方便以后的数据分析，这里我们只选取了易于量化分析的变量：小区名，均价，经纬度信息，房龄，建筑数，房屋数量。当然也可以将其他变量也存储到数据库，用于定制化数据查询筛选。这里选取MongoDB作为存储数据库，其优点在于相对于传统的关系型数据库，MongoDB采用了文档结构的存储方式，能够更加便捷的获取数据，也更能保证用户的访问速度。

### 1.4 顶层调用
顶层模块会先读取第一步生成的URL文件，与基址组装成完整的URL后，调用线程池里的请求函数开始数据爬取。
```{r, eval=FALSE,  message=FALSE}
fs.readFile(__dirname + '/lianjia_community_SubUrls.txt', {flag: 'r+', encoding: 'utf8'}, function(err, data) {
    if(err) {
    	console.log("error");
   	}
    urls = data.toString().split(",");
    for(i in urls) {
    	urls[i] = urlBase + urls[i];
      if(i == urls.length) break;
    }
	new Pool(urls).query();
});
```
至此我们完成了并发进程数，访问时间间隔可调的数据爬虫，将爬取存储到了MongoDB数据库，可根据需求导出csv或JSON格式的文件。

## 2. 数据分析
在该部分我们主要完成两个任务: 基于小区经纬度信息的地理聚类，对给定位置房龄等信息的小区均价预测。这里使用了基于R语言的机器学习算法：k-means聚类算法和多元线性回归算法。

### 2.1 基于小区经纬度的地理聚类
在使用kmeans聚类算法做地理聚类分析前，需要先做数据清洗和预处理。由于数据爬取的结果经常会出现缺失值或无效值，为了防止导致后面的运行出错或结果异常，需要先清除这些异常值。

#### 数据清洗与预处理
这里的异常值主要是个别经纬度为0的值，需要先查看异常值的数量，当异常值所占比重不大时可以直接剔除，假如比重较大或不方便删除时可以考虑根据与相邻值的关系做数据填充。
```{r, eval=FALSE,  message=FALSE}
apply(geodata,1,function(x) sum(x==0))
geodata1 <- geodata[which(rowSums(geodata==0)==0),]
head(geodata1)
str(geodata1)
```
由于不同数据的量纲范围不同，不便比较，因此一般会先做正规化预处理。
```{r, eval=FALSE,  message=FALSE}
min.max.norm <- function(x){
  (x-min(x))/(max(x)-min(x))
}
raw.data <- geodata2[,1:2]
norm.data <- data.frame(sl = min.max.norm(raw.data[,1]),
                        sw = min.max.norm(raw.data[,2]))
```

#### kmeans聚类算法
kmeans是应用最广泛的数据聚类算法之一，一般在数据分析前期使用，选取适当的k将数据分类，研究数据的聚类特征。其计算方法如下：
1. 随机选取k个中心点
2. 遍历所有数据，将每个数据划分到最近的中心点中
3. 计算每个聚类的平均值，并作为新的中心点
4. 重复2-3，直到这k个中线点不再变化（收敛了），或执行了足够多的迭代
在实际应用中，k值一般不会取得太大，可以通过枚举，设置为2到固定值如7，为避免局部最优，在每个k值上运行多次kmeans,并计算轮廓系数，最终去平均作为最终评价标准。
```{r, eval=FALSE,  message=FALSE}
K <- 2:7
round <- 30 # 每次迭代30次,避免局部最优
# 计算轮廓系数：Silhouette Coefficient
rst <- sapply(K, function(i) {
  print(paste("K=", i))
  mean(sapply(1:round,function(r) {
    print(paste("Round", r))
    result <- kmeans(norm.data, i)
    stats <- cluster.stats(dist(norm.data), result$cluster)
    stats$avg.silwidth
  }))
})
plot(K,rst,type='l',main='Silhouette Coefficient vs K', ylab='Silhouette Coefficient')
```
<img src="http://ogx7uv5qv.bkt.clouddn.com/Rplot_kmeans.png" >

选取K标准是：对于一个给定的类簇指标，当我们假设的类簇数目等于或高于真实的类簇数据时，该指标上升会很慢，而一旦试图得到少于真实数目的类簇时，该指标会急剧上升。一般我们会选取该拐点的K值。最后根据选取的K值绘制散点图观察数据聚类特征。这里我们选取3作为K值。

<img src="http://ogx7uv5qv.bkt.clouddn.com/Rplot_kmeans_3.png" >

由于kmeans聚类算法在数据量比较大时很占用内存，因此这里只分次选取一部分数据做地理聚类，后面会尝试使用亚马逊云平台AWS做全部数据的地理聚类。

### 2.2 基于多元线性回归的小区均价预测
在实际问题中影响变量的因素往往不止一个，对于房价来说也是如此，地理位置，房龄，建筑数量等因素都会影响到房价的高低。多元线性回归是分析这种多维度的复杂变量关系的有力工具。在做多元线性回归前，也需要对数据进行筛选，清洗和其他必要的预处理。

#### 数据预处理
首先根据要分析的目标变量筛选数据，由于我们的因变量是均价，因此首先剔除价格为空的数据，再删除经纬度为无效值的数据，其他含NA项的数据由于数量不多影响不大也一并删除。最后由于房价的特殊性，经常会出现个别点由于存在独特的优势，比如靠近好学区而导致房价异常高，或者房价特别低的假房源，这些也都需要预先删除防止对线性回归模型产生不利影响。
```{r, eval=FALSE,  message=FALSE}
#数据筛选
ds_community1 <- ds_community[,c("age", "lat", "lng", "house_count", "building_count", "avr_price")]
#查看价格为空的数据
ds_community1[!complete.cases(ds_community1["avr_price"]),]
nrow(ds_community1[!complete.cases(ds_community1["avr_price"]),])
#剔除价格为空的数据
ds_community2 <- ds_community1[complete.cases(ds_community1["avr_price"]),]
#剔除经纬度为0的数据
ds_community3 <- ds_community2[which(rowSums(ds_community2["lat"]==0)==0),]
#查看与删除含NA项
ds_community3[!complete.cases(ds_community3),]
ds_community4 <-na.omit(ds_community3)
#利用boxplot剔除异常值
ab_num <- which(ds_community4$avr_price %in% boxplot.stats(ds_community4$avr_price)$out)
ds_community5 <- ds_community4[-ab_num,]
str(ds_community5)
```
这里我们使用boxplot来删除房价特别高或特别低的异常点。一个典型的Box Plot是基于以下五个值计算出来的：一组样本的最大值，最小值，中值，上四分位值，下四分位值，超过上下四分位的值被看做Outliers异常值。

#### 多元线性回归
多元线性回归的分析方法通常需要先选取多元数据集并定义数学模型，然后进行参数估计，对估计出的参数进行显著性检查，残差分析，异常点检测，最后确定回归方程进行模型预测。
由于多元回归方程有多个自变量，区别于一元回归方程，有一项很重要的操作就是自变量的优化，挑选出相关性最显著的自变量，同时去除不显著的自变量。在R语言中，有很方便地用于优化函数，可以很好的帮助我们来改进回归模型。
这里选择的自变量为房龄age,经度lat,维度lng,房屋数量house_count,建筑数量building count，调用lm()构建出线性回归模型，使用summary函数提取回归显著性检验结果。
```{r, eval=FALSE,  message=FALSE}
reg1=lm(avr_price~age+lat+lng+house_count+building_count)
reg1
summary(reg1)

Call:
lm(formula = avr_price ~ age + lat + lng + house_count + building_count)

Residuals:
   Min     1Q Median     3Q    Max 
-75021 -13872  -1751  11917  68080 

Coefficients:
                 Estimate Std. Error t value Pr(>|t|)    
(Intercept)    -4.024e+06  1.429e+05 -28.164  < 2e-16 ***
age             4.007e+02  1.010e+01  39.679  < 2e-16 ***
lat             2.803e+04  1.598e+03  17.539  < 2e-16 ***
lng             2.623e+04  1.085e+03  24.169  < 2e-16 ***
house_count    -3.364e-01  3.068e-01  -1.096    0.273    
building_count -1.815e+01  3.338e+00  -5.436 5.56e-08 ***
---
Signif. codes:  0 ‘***’ 0.001 ‘**’ 0.01 ‘*’ 0.05 ‘.’ 0.1 ‘ ’ 1

Residual standard error: 19020 on 11994 degrees of freedom
Multiple R-squared:  0.2042,	Adjusted R-squared:  0.2039 
F-statistic: 615.5 on 5 and 11994 DF,  p-value: < 2.2e-16
```
多元线性回归的显著性检验包含了T检验，F检验和R平方检验，这里除了house_count外，其他自变量的检验结果都比较显著，T检验结果为***，F检验的P-value < 2.2e-16。
下面我们将不显著的house_count变量去除后，再次构建回归模型进行参数估计：
```{r, eval=FALSE,  message=FALSE}
reg2=lm(avr_price~age+lat+lng+building_count)
reg2
summary(reg2)
Call:
lm(formula = avr_price ~ age + lat + lng + building_count)

Residuals:
   Min     1Q Median     3Q    Max 
-75128 -13879  -1795  11906  68312 

Coefficients:
                 Estimate Std. Error t value Pr(>|t|)    
(Intercept)    -4.025e+06  1.429e+05 -28.170  < 2e-16 ***
age             4.020e+02  1.002e+01  40.109  < 2e-16 ***
lat             2.793e+04  1.596e+03  17.505  < 2e-16 ***
lng             2.627e+04  1.085e+03  24.207  < 2e-16 ***
building_count -1.998e+01  2.889e+00  -6.914 4.94e-12 ***
---
Signif. codes:  0 ‘***’ 0.001 ‘**’ 0.01 ‘*’ 0.05 ‘.’ 0.1 ‘ ’ 1

Residual standard error: 19030 on 11995 degrees of freedom
Multiple R-squared:  0.2041,	Adjusted R-squared:  0.2038 
F-statistic:   769 on 4 and 11995 DF,  p-value: < 2.2e-16
```
这次结果所有的自变量都比较显著。在进行完显著性检验后我们还需要做残差分析(预测值和实际值之间的差)，检验模型的正确性，残差必须服从正态分布N(0,σ^2)。直接用plot()函数生成4种用于模型诊断的图形，进行直观地分析。
<img src="http://ogx7uv5qv.bkt.clouddn.com/Rplot_prediction.png" >

残差和拟合值(左上)：残差和拟合值之间数据点均匀分布在y=0两侧，呈现出随机的分布，红色线呈现出一条大致平稳的曲线并没有明显的形状特征。
残差QQ图(右上)：数据点按对角直线排列，趋于一条直线，并被对角直接穿过，直观上符合正态分布。
标准化残差平方根和拟合值(左下)：数据点均匀分布在红色线两侧，呈现出随机的分布，红色线呈现出一条大致平稳的曲线
标准化残差和杠杆值(右下)：没有出现红色的等高线，则说明数据中没有特别影响回归结果的异常点。
结论：没有明显的异常点，残差符合假设条件。
最后我们使用构建的多元线性回归模型预测出两个给定小区的均价：
```{r, eval=FALSE,  message=FALSE}
lat <- c(31.2,31.25)
lng <- c(121.4,121.5)
age <- c(15,5)
house_count <- c(240,800)
building_count <- c(10,10)
predict_data <- data.frame(age, lat, lng, building_count)
result_data <- b0+b1*predict_data$age+b2*predict_data$lat+b3*predict_data$lng+b4*predict_data$building_count
> result_data
[1] 40915.19 40933.01
```
可见两者的均价差别不大。从线性回归的系数也可以看出基于经纬度的地理因素影响最为显著，而两个小区的距离换算后也在10公里上下，因此均价的差别从常识和模型参数角度理解都比较合理。

## 3. 数据可视化
图形化的信息可以让人们对数据有更加直观清晰的理解，想制作出好的数据可视化图表，好的工具不可或缺，近年来有许多图表开源库和工具不断涌现，比如Google chart, echarts, HighCharts, leaflet, D3等等，这里我们选择leaflet作为我们的数据可视化工具。
Leaflet 是一个可以同时良好运行于桌面和移动端的 Javascript 可交互地图库，它的内核库很小，但由丰富的插件可以大幅拓展其功能，比较适合用于需要展示地理位置的数据可视化项目。这里我们将尝试两种可视化方案。

### 3.1 分级数据可视化
数据可视化的流程一般包括底图选取，数据读取，颜色形状渲染，交互式设计等等。
```{r, eval=FALSE,  message=FALSE}
  var map = L.map('map-container', {"center":[31.132901401103307,121.40098571777344],"zoom":10});
  var tileLayer = L.tileLayer('//map.geoq.cn/ArcGIS/rest/services/ChinaOnlineStreetPurplishBlue/MapServer/tile/{z}/{y}/{x}').addTo(map);
```
我们选取了ChinaOnlineStreet作为瓦片地图，并且通过经纬度数据将地图中心点定位到上海。
```{r, eval=FALSE,  message=FALSE}
fetch('./data/lianjia_shanghai_communities.json')
...
  var price = d.avr_price;
  var priceMin = priceRange[0], priceMax = priceRange[1];
  var price01 = getK(price, priceMin, priceMax);
  var size = getSize(price01);
  var color = getColor(price01);
  
  function getK(v, min, max){
    v = Math.max(Math.min(v, max), min);
    return (v - min) / (max - min);
  }
  function getColor(d) {
    return d > 0.8  ? '#800026' :
           d > 0.7  ? '#BD0026' :
           d > 0.6  ? '#E31A1C' :
           d > 0.5  ? '#FC4E2A' :
           d > 0.4  ? '#FD8D3C' :
           d > 0.3  ? '#FEB24C' :
           d > 0.2  ? '#FED976' :
                      '#FFEDA0';
  }
```
读取json数据源后，对价格数据做归一化处理，然后使用颜色映射函数和大小映射函数得到颜色和大小信息。归一化操作将价格转换为0到1的系数，颜色再根据其大小分级映射到不同深浅的颜色上。
```{r, eval=FALSE,  message=FALSE}
      var circle = L.circleMarker({
        lat: d.lat,
        lng: d.lng
      }, {
        stroke: false,
        fillColor: color
      })
      .addTo(map);
      circle.setRadius(size);
      circle.bindPopup('小区名:' + d.community_name + '<br> 每平米价格： ' + d.avr_price);
```
最后将地理数据，颜色和大小信息映射到地图上，并且加上了点击弹出小区价格的互动设计。完整代码请参考shanghai_community_price_choropleth map.html。效果图如下：

<img src="http://ogx7uv5qv.bkt.clouddn.com/map1.png" >


### 3.2 交互数据可视化
上述地图完成了基本的分级数据可视化，但是灵活性和交互性不足，下面我将尝试让颜色和大小都可控，并且加上过滤函数，这样使用者可以过滤出自己关心的价格区间。
```{r, eval=FALSE,  message=FALSE}
  var gui = new dat.gui.GUI();
  var p1 = gui.addFolder('颜色');
  p1.addColor(crange, '0').name('最小值颜色').onChange(updateScatter);
  p1.addColor(crange, '1').name('最大值颜色').onChange(updateScatter);
  p1.add(rrange, '0', 0, 20).name('最小值大小').onChange(updateScatter);
  p1.add(rrange, '1', 0, 50).name('最大值大小').onChange(updateScatter);

  p1.add(filterRange, '0', 10000, 100000).name('过滤范围min').onChange(updateScatter);
  p1.add(filterRange, '1', 10000, 300000).name('过滤范围max').onChange(updateScatter);
  p1.open();
```
交互设计的核心在在于调用了dat.gui库生成控制面板，并且在改变颜色大小等信息后通过updateScatter函数更新地图可视化信息。
```{r, eval=FALSE,  message=FALSE}
  function updateScatter(){
    circles.forEach(function(circle){
      var d = circle.__data;
      var price = d.avr_price;
      var priceMin = priceRange[0], priceMax = priceRange[1];
      var price01 = getK(price, priceMin, priceMax);
      var size = getSize(price01);
      var color = getColor(price01);
      if(!rangeFilter(d)) color = 'rgba(0,0,0,0)';
      ...
  function rangeFilter(d){
    return d.avr_price > filterRange[0] && d.avr_price < filterRange[1]
  }
```
在更新函数updateScatter中我们会重新计算颜色大小等信息，rangeFilter函数会滤除filterRange外的数据。另外为了更好表现颜色的变化我们把Mapbox作为新的瓦片地图源。完整代码参见shanghai_community_price_interactive_leaflet.html。效果图如下：
<img src="http://ogx7uv5qv.bkt.clouddn.com/map2.png" >

## 4. 自定义扩展项目
小区数据只能反映出上海整体范围内的价格分布，而对于有意购房或卖房的用户来说可能对具体的房源信息更加感兴趣。因此在我们在自定义项目部分选择爬取链家网上的二手房成交房源信息。
该部分的爬虫代码的结构与小区爬虫类似，区别主要在于基址URL信息和根据DOM解析URL部分。我们抓取的信息包括，房屋标签名，成交日期，成交价格，楼层，年代，装修，朝向，小区位置和房源编号。具体抓取结果参见/data/lianjia_shanghai_traded.xls，代码参见lianjia_traded系列文件。
这些抓取结果至少有两个方面的用途：一是用于建立全面的房源数据库，方便用户个性化查询，我们可以用类似的策略将其他二手房新房信息都爬取存储到本地MongoDB数据库; 二是根据爬取信息建立房价模型，用于预测和评估特定房源的价格。该部分的困难在于有些不易量化的信息，如房屋朝向，楼层，房型，装修等，我们可以将不同类型转化为数字等级指标，再输入到多元线性回归模型做参数估计。由于越精细化的数据越容易出偏差，为了增加模型精度，可以考虑将房源所属小区的均价作为模型的辅助输入参数。在后面时间更充足的情况下我们也会尝试优化代码结构，增加模块的可复用性和鲁棒性。



