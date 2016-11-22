#小区价格预测

#install.packages("Hmisc")
#library(Hmisc)
library(readxl)
library(DMwR)
library(fpc)

# read data
file <- "C:/project/shanghai_lianjia_house_price/data/lianjia_shanghai_communities.xls"
ds_community <- read_excel(file, sheet = 1, na = "NA")

#查看数据
names(ds_community)
head(ds_community)
str(ds_community)

#数据筛选
ds_community1 <- ds_community[,c("age", "lat", "lng", "house_count", "building_count", "avr_price")]
head(ds_community1)
str(ds_community1)
#去除价格为空的数据
ds_community1[!complete.cases(ds_community1["avr_price"]),]
nrow(ds_community1[!complete.cases(ds_community1["avr_price"]),])

ds_community2 <- ds_community1[complete.cases(ds_community1["avr_price"]),]
head(ds_community2)
str(ds_community2)

# 数据观测 - 查看每行缺失值
apply(ds_community2,1,function(x) sum(is.na(x)))
head(ds_community2)

# 查看缺失部分
ds_community2[!complete.cases(ds_community2),]
nrow(ds_community2[!complete.cases(ds_community2),])
nrow(ds_community2)

# 剔除经纬度为0的数据
ds_community3 <- ds_community2[which(rowSums(ds_community2["lat"]==0)==0),]
head(ds_community3)
str(ds_community3)

ds_community3[!complete.cases(ds_community3),]
# 删除含NA项 或填充
ds_community4 <-na.omit(ds_community3)
head(ds_community4)
str(ds_community4)

#利用boxplot剔除异常值
ab_num <- which(ds_community4$avr_price %in% boxplot.stats(ds_community4$avr_price)$out)
ds_community5 <- ds_community4[-ab_num,]
str(ds_community5)

train_comu_ds<-ds_community5[1:12000,]
test_comu_ds<-ds_community5[12000:14000,]

attach(train_comu_ds)
# plot the data
plot(train_comu_ds)
names(train_comu_ds)
# 1. calculate the correlation
cor(train_comu_ds)
cor.test(avr_price,age)  
cor.test(avr_price,lat)  
cor.test(avr_price,lng)  
cor.test(avr_price,house_count)  
cor.test(avr_price,building_count) 

# 2. Multi-var linear regression
# Model 1: 5 vars
reg1=lm(avr_price~age+lat+lng+house_count+building_count)
summary(reg1)

old.par <- par(mfrow = c(2,2))
plot(reg1)

# Model 1: 4 vars
reg2=lm(avr_price~age+lat+lng+building_count)
summary(reg2)
plot(reg2)
par(old.par)
detach(train_comu_ds)
search()

#寻找异常点
#par(mfrow = c(1,1))
#qqPlot(reg2, id.method = "identify", simulate=TRUE)

# 3. Model Interpretation
bb=coefficients(reg1)
b0=bb[[1]]
b1=bb[[2]]
b2=bb[[3]]
b3=bb[[4]]
b4=bb[[5]]

# 4. Prediction for evaluation
# Use test data
attach(test_comu_ds)
#a <- which(test_comu_ds$avr_price %in% boxplot.stats(test_comu_ds$avr_price)$out)
#test_comu_ds1 <- test_comu_ds[-a,]
str(test_comu_ds)
avr_price_rs=b0+b1*test_comu_ds$age+b2*test_comu_ds$lat+b3*test_comu_ds$lng+b4*test_comu_ds$house_count
detach(test_comu_ds)
str(avr_price_rs)
# 5. Model accurancy
error2<-mean((test_comu_ds$avr_price - avr_price_rs)/test_comu_ds$avr_price)
error2

#Predication
age <- c(15,5)
lat <- c(31.2,31.25)
lng <- c(121.4,121.5)
house_count <- c(240,800)
building_count <- c(10,10)
predict_data <- data.frame(age, lat, lng, building_count)
predict_data
result_data <- b0+b1*predict_data$age+b2*predict_data$lat+b3*predict_data$lng+b4*predict_data$building_count
result_data

