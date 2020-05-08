/**
 * 
 * @param {*} it iterator 迭代器 
 */
function co(it) {
    return new Promise((reslove, reject) => {
        function next(data) {
            let { value, done } = it.next(data);
            if (!done) {
                Promise.resolve(value).then(data => {
                    next(data)
                }, reject)
            } else {
                reslove(data)
            }
        }
        next()
    })
}

module.exports = co;
