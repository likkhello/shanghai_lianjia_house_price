#上海小区地理聚类分析

# install.packages("ggplot2")
library(readxl)
library(DMwR)
library(fpc)
library(ggplot2)

## 读取数据
file <- "C:/project/shanghai_lianjia_house_price/data/lianjia_shanghai_communities.xls"
ds <- read_excel(file, sheet = 1, na = "NA")

##数据查看
names(ds)
head(ds)
str(ds)

#数据筛选
geodata <- ds[,c("lat", "lng")]
head(geodata)
str(geodata)

##数据清洗
# 数据观测 - 查看每行无效值0
apply(geodata,1,function(x) sum(x==0))

# 剔除缺失部分
geodata1 <- geodata[which(rowSums(geodata==0)==0),]
head(geodata1)
str(geodata1)
geodata2 <- geodata1[7000:10000,]
str(geodata2)

# 0-1 正规化数据
min.max.norm <- function(x){
  (x-min(x))/(max(x)-min(x))
}
raw.data <- geodata2[,1:2]
norm.data <- data.frame(sl = min.max.norm(raw.data[,1]),
                        sw = min.max.norm(raw.data[,2]))
norm.data

# k取2到7,评估K
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

k = 3 # 根据上面的评估 k=3最优
clu <- kmeans(norm.data,k)
mds = cmdscale(dist(norm.data,method="euclidean"))
#使用基础绘画功能
plot(mds, col=clu$cluster, main='kmeans - k=3', pch = 19)

old.par <- par(mfrow = c(1,1))
#使用ggplot
ggplot(data=NULL, aes(x=mds[,1], y=mds[,2])) +
  geom_point(color = clu$cluster) +
  geom_text(aes(.15, -.4, label="Geo cluster for Shanghai communities", color="red"))


