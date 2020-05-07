const PENDING = 'PENDING'
const FULFILLED = 'FULFILLED'
const REJECTED = 'REJECTED'
const resolvePromise = (promise2, x, resolve, reject) => {
    //判断  不同的Promise之间混用   需要做兼容处理
    // 对返回值进行判断
    if (promise2 === x) {       //promise2 和 x 相同 直接reject 报错
        return reject(new TypeError('Chaining cycle detected for promise #<Promise>'))
    }
    if (typeof x === 'object' && x !== null || typeof x === 'function') {
        let called; //兼容处理  不能多次调用成功或者失败
        // x需要是一个对象或者函数  取出then方法（有可能报错，definProperyty定义的then方法）
        try {
            let then = x.then;
            if (typeof then === 'function') {
                //判断then是不是一个函数，如果不是函数 说明不是promise
                then.call(x, y => {
                    if (called) return;
                    called = true;
                    resolvePromise(promise2, y, resolve, reject);          //递归解析
                }, r => {            //直接把r作为失败结果
                    if (called) return;
                    called = true;
                    reject(r);
                });
            } else {
                return resolve(x)
            }
        } catch (e) {
            if (called) return;
            called = true;
            return reject(e)
        }
    } else {
        return resolve(x);          //普通值直接成功   
    }
}
class Promise {
    constructor(executor) {
        this.status = PENDING;  //默认是等待态
        this.value = undefined;
        this.reason = undefined;
        this.onReslovedCallbacks = [];
        this.onRejectedCallbacks = [];
        let resolve = (value) => {
            if (value instanceof Promise) {   //递归解析
                return value.then(resolve, reject);
            }
            //只有状态是等待态的时候才能够更新
            // console.log(value,this.status,'this.status')
            if (this.status == PENDING) {
                this.status = FULFILLED
                this.value = value;
                this.onReslovedCallbacks.forEach(fn => fn())
            }
        }
        let reject = (reason) => {
            if (this.status == PENDING) {
                this.status = REJECTED
                this.reason = reason;
                this.onRejectedCallbacks.forEach(fn => fn());
            }
        }
        //try catch 只能补货同步异常
        try {
            executor(resolve, reject)
        } catch (e) {
            reject(e)
        }
    }

    then(onFulfilled, onRejected) {
        //穿透
        onFulfilled = typeof onFulfilled == 'function' ? onFulfilled : v => v;
        onRejected = typeof onRejected == 'function' ? onRejected : err => { throw err };
        let promise2 = new Promise((resolve, reject) => {
            if (this.status === FULFILLED) {
                setTimeout(() => {
                    try {
                        let x = onFulfilled(this.value);
                        resolvePromise(promise2, x, resolve, reject);
                    } catch (e) {
                        reject(e)
                    }
                }, 0)
            }
            if (this.status === REJECTED) {
                setTimeout(() => {
                    try {
                        let x = onRejected(this.reason);
                        resolvePromise(promise2, x, resolve, reject);
                    } catch (e) {
                        reject(e)
                    }
                }, 0)
            }
            if (this.status === PENDING) {
                this.onReslovedCallbacks.push(() => {
                    setTimeout(() => {
                        try {
                            let x = onFulfilled(this.value);
                            resolvePromise(promise2, x, resolve, reject);
                        } catch (e) {
                            reject(e)
                        }
                    }, 0)
                });
                this.onRejectedCallbacks.push(() => {
                    setTimeout(() => {
                        try {
                            let x = onRejected(this.reason);
                            resolvePromise(promise2, x, resolve, reject);
                        } catch (e) {
                            reject(e)
                        }
                    }, 0)
                });
            }
        })

        return promise2

    }

    catch(errCallback) {         //没用成功的then
        return this.then(null, errCallback)
    }

    finally(callback) {
        return this.then(data => {
            return Promise.resolve(callback()).then(() => data);
        }, err => {
            return Promise.resolve(callback()).then(() => { throw err });
        });
    };

}

const isPromise = value => {
    if (typeof value === 'object' && value !== null || typeof value === 'function') {
        return typeof value.then === 'function'
    } else {
        return false
    }
}

Promise.all = function (promises) {
    return new Promise((resolve, reject) => {
        let arr = [];
        let i = 0;
        const processData = (index, data) => {
            arr[index] = data;
            if (++i === promises.length) {
                resolve(arr);
            }
        }
        for (let i = 0; i < promises.length; i++) {
            let current = promises[i];
            if (isPromise(current)) {
                current.then(data => {
                    processData(i, data);
                }, reject)
            } else {
                processData(i, current);
            }
        }
    })
}


Promise.race = function (promises) {
    return new Promise((resolve, reject) => {
        promises.forEach(p => {
            p.then(resolve, reject)
        })
    })
}


Promise.resolve = function (value) {
    return isPromise(value) ? value : new Promise(resolve => resolve(value));
}


Promise.reject = function (err) {
    return new Promise((resolve, reject) => {
        reject(err);
    });
}


Promise.try = function (fn) {
    return new Promise((resolve, reject) => {
        if (typeof fn !== 'function') {
            let reason = Object.prototype.toString.call(fn)
            reject(new TypeError(`expecting a function but got ${reason}`))
        }
        resolve(fn())
    });
}


Promise.any = function (promises) {
    return new Promise((resolve, reject) => {
        let i = 0;
        let data = Object.create(null);
        promises.forEach(current => {
            if (isPromise(current)) {
                current.then(data => {
                    resolve(data);
                }, err => {
                    data[i++] = err;
                    data.length = i;
                    i === promises.length && reject(data);
                })
            } else {
                resolve(current)
            }
        })
    })
}


Promise.allSettled = function (promises) {
    return new Promise((resolve, reject) => {
        let arr = [];
        let i = 0;
        const processData = (index, data) => {
            arr[index] = data;
            if (++i === promises.length) {
                resolve(arr);
            }
        }
        for (let i = 0; i < promises.length; i++) {
            let current = promises[i];
            if (isPromise(current)) {
                current.then(data => {
                    processData(i, { status: 'rejected', value: data });
                }, err => {
                    processData(i, { status: 'rejected', reason: err });
                })
            } else {
                processData(i, { status: 'fulfilled', value: current });
            }
        }
    })
}


// npm i promises-aplus-tests -g
//延迟对象
Promise.deferred = function () {
    let defer = {}
    defer.promise = new Promise((resolve, reject) => {
        defer.resolve = resolve
        defer.reject = reject
    })
    return defer
}


module.exports = Promise
