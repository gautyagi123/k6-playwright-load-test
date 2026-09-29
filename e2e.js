import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const baseURL = 'https://quickpizza.grafana.com';

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
    vus: 2,
    duration: '3s',
}

export default function () {
    let userReg = false;
    let userAuth = false;
    let authToken = '';
    let user = generateUser();

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
            "response code is 200": (resp) => {
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
            'response code is 201': (respLogin) => {
                return respLogin.status === 200;
            },
            'response contains token': (respLogin) => {
                return respLogin.json('token').length > 1;
            }
        })
        if (userAuth) {
            authToken = respLogin.json('token');
            console.log(registerpayload.username);
            console.log(registerpayload.password);
            console.log(authToken);
        }
    })
}