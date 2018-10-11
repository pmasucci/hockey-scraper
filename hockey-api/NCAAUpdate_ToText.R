require(RODBC)
require(tibble)
require(rvest)
require(RCurl)

#Get URLS
URL <- "http://collegehockeyinc.com/stats/compnatfull17.php"
test.html <- read_html(URL)
NCAAlinks <- html_attr(html_nodes(test.html, "td:nth-child(9) a"),"href")
NCAAlinks <- as.data.frame(NCAAlinks)
colnames(NCAAlinks) <- c("pageurl")

for (i in 1:nrow(NCAAlinks)) {
  
  URL <- as.character(NCAAlinks[i, 1])
    gamesheet <- read_html(URL)

#gameinfo
tbl <- gamesheet %>%
  html_nodes("table") %>%
  .[[2]] %>%
  html_table(fill = TRUE,
             header = FALSE,
             trim = TRUE)
tbl <- tbl$X5[1]
tbl <- as.data.frame(tbl)
tbl$pageurl <- URL

tbl$tbl <- gsub('\n', '--', tbl$tbl)
tbl$tbl <- gsub(',', '', tbl$tbl)

write.table(
  tbl,
  file = 'ImptblNCAAGame.txt',
  sep = ',',
  col.names = FALSE,
  row.names = FALSE,
  append = TRUE)

#goals
tbl <- gamesheet %>%
  html_nodes("table") %>%
  .[[9]] %>%
  html_table(fill = TRUE,
             header = FALSE,
             trim = TRUE)

tbl$pageurl <- URL

tbl$X8 <- gsub(',', '-', tbl$X8)
tbl$X9 <- gsub(',', '-', tbl$X9)
tbl$X10 <- gsub(',', '-', tbl$X10)

tbl = tbl[-1,]

write.table(
  tbl,
  file = 'ImptblNCAAPbP.txt',
  sep = ',',
  col.names = FALSE,
  row.names = FALSE,
  append = TRUE)

#away roster
tbl <- gamesheet %>%
  html_nodes("table") %>%
  .[[11]] %>%
  html_table(fill = TRUE,
             header = FALSE,
             trim = TRUE)

tbl$pageurl <- URL
tbl$ishome <- 0

tbl = tbl[-1,]
tbl <- subset(tbl,  X3!= 'Did Not Play')
tbl <- tbl[!grepl("Totals", tbl$X1), ]

write.table(
  tbl,
  file = 'ImptblNCAARoster.txt',
  sep = ',',
  col.names = FALSE,
  row.names = FALSE,
  append = TRUE)

#home roster
tbl <- gamesheet %>%
  html_nodes("table") %>%
  .[[12]] %>%
  html_table(fill = TRUE,
             header = FALSE,
             trim = TRUE)

tbl$pageurl <- URL
tbl$ishome <- 1

tbl = tbl[-1,]
tbl <- subset(tbl,  X3!= 'Did Not Play')
tbl <- tbl[!grepl("Totals", tbl$X1), ]

write.table(
  tbl,
  file = 'ImptblNCAARoster.txt',
  sep = ',',
  col.names = FALSE,
  row.names = FALSE,
  append = TRUE)

#away goalies
tbl <- gamesheet %>%
  html_nodes("table") %>%
  .[[13]] %>%
  html_table(fill = TRUE,
             header = FALSE,
             trim = TRUE)

tbl = tbl[-1,]
tbl$IsHome <- 0
tbl$pageurl = URL
tbl$X2 <- gsub(',', '-', tbl$X2)

write.table(
  tbl,
  file = 'ImptblNCAAGoalies.txt',
  sep = ',',
  col.names = FALSE,
  row.names = FALSE,
  append = TRUE)

#home goalies
tbl <- gamesheet %>%
  html_nodes("table") %>%
  .[[14]] %>%
  html_table(fill = TRUE,
             header = FALSE,
             trim = TRUE)

tbl = tbl[-1,]
tbl$IsHome <- 1
tbl$pageurl = URL
tbl$X2 <- gsub(',', '-', tbl$X2)

write.table(
  tbl,
  file = 'ImptblNCAAGoalies.txt',
  sep = ',',
  col.names = FALSE,
  row.names = FALSE,
  append = TRUE)

print(paste(URL,'complete! :) '))

}