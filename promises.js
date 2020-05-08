/**
 * 
 * @param {*} fn    包装成promise 
 */


function promise(fn) {
    return function (...args) {
        return new Promise((reslove, reject) => {
            fn(...args, function (err, data) {
                if (err) {
                    reject(err)
                } else {
                    reslove(data)
                }
            })
        })
    }
}


/**
 * 
 * @param {*} obj   更改的模块
 */

function promises(obj) {
    for (let key in obj) {
        if (typeof obj[key] === 'function') {
            obj[key] = promise(obj[key])
        }
    }
}

module.exports = promises;