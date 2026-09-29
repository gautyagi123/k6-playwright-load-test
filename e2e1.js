import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const baseURL = 'https://quickpizza.grafana.com';

const authRate = new Rate('auth_Rate'); // to check validation for specific checks [custom metric]
const succOrder = new Counter('success_order'); // to check occurance use counter

function randomString(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function generateUser() {
    return {
        username: `gautyagi_${randomString(6)}`,
        password: `Pass_${randomString(8)}`,
    };
}

export const options = {
    stages: [
        { duration: '5s', target: 2 }, //Ramp up to 2 users over 4 second gradually
        { duration: '5s', target: 4 }, //Stay at url for 5 seconds with 5 users 
        { duration: '3s', target: 0 }  //ramp down to 0 users gradually 
    ],
    thresholds: {
        'group_duration{group:::User Registration}': ['p(95) < 2000'], //this is custom metrics
        'group_duration{group:::User Login}': ['p(95) < 400'], //this is custom metrics
        'http_req_duration': ['p(95) < 400'],
        'http_req_failed': ['rate < 0.1'],  // rate ranges from 0 to 1, 0.1 means if 24 calls are made so if more than 2or3 fails it will trhow an error
        'checks': ['rate > 0.9'],
        'auth_Rate': ['rate > 0.9'],
        'success_order': ['count>5'],
    }
}

export default function () {
    let userReg = false;
    let userAuth = false;
    let orderAuth = false;
    let authToken = null;
    let user = generateUser();
    let pizzaTokenID = null;

    group('User Registration', function () {
        const registerpayload = {
            username: user.username,
            password: user.password,
        }

        const params = {
            headers: { 'content-Type': 'application/json' },
        }

        const resp = http.post(`${baseURL}/api/users`, JSON.stringify(registerpayload), params);

        userReg = check(resp, {
            "response code is 201": (resp) => {
                return resp.status === 201;
            }
        })
        if (!userReg) {
            console.error(`error ${resp.status} ${resp.body}`);
        }

        sleep(1);

    })

    group('User Login', function () {
        const registerpayload = {
            username: user.username,
            password: user.password,
        }

        const params = {
            headers: { 'content-Type': 'application/json' },
        }
        const respLogin = http.post(`${baseURL}/api/users/token/login`, JSON.stringify(registerpayload), params);

        userAuth = check(respLogin, {
            'response code is 200': (respLogin) => {
                return respLogin.status === 200;
            },
            'response contains token': (respLogin) => {
                return respLogin.json('token').length > 1;
            }
        })
        if (userAuth) {
            authRate.add(1);
            authToken = respLogin.json('token');
            console.log(registerpayload.username);
            console.log(registerpayload.password);
            console.log(authToken);
        }
        else {
            authRate.add(0);
        }
    })

    group('Placing Order', function () {

        const params = {
            headers: {
                'content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
        }

        const orderPayload = {
            maxCaloriesPerSlice: 1000,
            mustBeVegetarian: true,
            excludedIngredients: [],
            excludedTools: ["Pizza cutter"],
            maxNumberOfToppings: 9,
            minNumberOfToppings: 2,
            customName: "hello"
        }

        const orderResp = http.post(`${baseURL}/api/pizza`, JSON.stringify(orderPayload), params);

        orderAuth = check(orderResp, {
            'response code is 200': (orderResp) => {
                return orderResp.status === 200;
            },
        })

        if (orderAuth) {
            succOrder.add(1);
            console.log('order is placed');
            console.log(orderResp.status);
            pizzaTokenID = orderResp.json('pizza.id');
        }
        else {
            console.error('order not placed');
            console.log(orderResp.status);
        }
        sleep(0.5);

        const datafetch = http.get(`${baseURL}/api/pizza/${pizzaTokenID}`, params);

        const validateID = datafetch.json('id');

        if (validateID === pizzaTokenID) {
            console.log('correctly fetching orders');
        }
    })
}
