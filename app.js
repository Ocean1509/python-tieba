const request = require('request');
const cheerio = require('cheerio');
const async = require('async');
const pLimit = require('p-limit');
const find = require('lodash.find')
const get = require('lodash.get')
const concat = require('lodash.concat')
const nodejieba = require("nodejieba")
const limit = pLimit(8);
// 标题筛选
var isKeyWords = '照相,拍照,测评,评测'

// 正文筛选
var contentWords = '摄像,拍照,人像,效果,图片,照片,相机'


// 关键字
var goodKeyWords = '好';

var badKeyWords = '不好'

// 真实贴吧数量
var actual = 46500;

// 使用贴吧数量
var num = 5000


function makeMap(str) {
  let keyW = isKeyWords.split(',');
  for (var i = 0; i < keyW.length; i++) {
    if (str.indexOf(keyW[i]) !== -1) {
      return true
    }
  }
  return false
}

function requestData(limit) {
  return new Promise((resolve, reject) => {
    return request(`http://tieba.baidu.com/f?kw=oppo&ie=utf-8&pn=${limit}`, (error, response, body) => {
      if (error) {
        return reject(error)
      }
      resolve(cheerio.load(body))
    })
  })
}

function requestDetail(url) {
  return new Promise((resolve, reject) => {
    return request(`http://tieba.baidu.com${url}`, (error, response, body) => {
      if (error) {
        return reject(error)
      }
      resolve(cheerio.load(body))
    })
  })
}

async function getTilteLists(num) {
  let arr = []
  let bodyLists = await requestData(num)
  let lists = bodyLists('#thread_list .threadlist_title');
  lists.each(function (i, ele) {
    let url = get(find(ele.children, {
      name: 'a'
    }), 'attribs.href')
    let text = bodyLists(this).text();
    if (makeMap(text)) arr.push({
      text,
      url
    })
  })
  return arr
}


var pPromise = [];

for (let i = 1; i < parseInt(num / 50); i++) {
  pPromise.push(limit(() => getTilteLists(i * 50)))
}



(async () => {
  // Only one promise is run at once

  var right = 0; // 不好
  var left = 0 // 好
  async function getContentsLists(id) {
    let arr = []
    let bodyLists = await requestDetail(id)
    let lists = bodyLists('.j_d_post_content');
    lists.each(function (i, ele) {
      let text = bodyLists(this).text();
      let cutL = nodejieba.cut(text);
      let contentWordsLists = contentWords.split(',');
      contentWordsLists.forEach((c) => {
        if (cutL.indexOf(c) !== -1) {
          if (cutL.indexOf(badKeyWords) !== -1) {
            right++;
            console.log('不好 ------------' + right)
          } else if (cutL.indexOf(goodKeyWords) !== -1) {
            left++
            console.log('好 ------------' + left)
          }
        } else {
          console.log('匹配不到----')
        }
      })
    })

    return arr
  }


  let contentP = []
  const result = await Promise.all(pPromise);
  let results = Array.prototype.concat.apply([], result);
  for (let i = 1; i < results.length; i++) {
    contentP.push(limit(() => getContentsLists(results[i].url)))
  }
  const dresult = await Promise.all(contentP);
  console.log('最终结果----好 -----' + left)
  console.log('最终结果----不好 -----' + right)
})();


