import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const apiRespTime = new Trend('pizza_resp_time');
const apiReqtTime = new Trend('pizza_reqt_time'); // to track only response time

export const options = {

    //in stage block adding data in array format 
    stages: [
        { duration: '4s', target: 2 }, //Ramp up to 2 users over 4 second gradually
        { duration: '5s', target: 5 }, //Stay at url for 5 seconds with 5 users 
        { duration: '3s', target: 0 }  //ramp down to 0 users gradually 
    ],
    thresholds: {
        'http_req_duration': ['p(95) < 400'],
        'http_req_failed': ['rate < 0.1'],  // rate ranges from 0 to 1, 0.1 means if 24 calls are made so if more than 2or3 fails it will trhow an error
        'checks': ['rate > 0.9'], //means validations must pass 90% or more 
        'http_req_duration{name:api}': ['p(95) < 500'],
        'http_req_failed{name:api}': ['rate < 0.1'],
        'pizza_resp_time': ['p(95) < 300'], //part of trend
        'pizza_reqt_time': ['p(95) < 300'],
    }
}



export default function () {
    const resp = http.get("https://quickpizza.grafana.com/");
    apiRespTime.add(resp.timings.receiving); //part of trend  
    apiReqtTime.add(resp.timings.duration)  
    //     sResponse.timings: {
    //     blocked: number;
    //     connecting: number;
    //     tls_handshaking: number;
    //     sending: number;
    //     waiting: number;
    //     receiving: number;
    //     duration: number;
    // }

    check(resp, {
        'status is 200': (resp) => {
            console.log(resp.status);
            return resp.status === 200;
        },
        'page contains pizza': (resp) => {
            console.log(resp.body);
            return resp.body.includes("pizza111111");
        }
    })

    http.get("https://quickpizza.grafana.api.com/", {
        tags: { name: 'api' }
    });


    sleep(1); //after 1 hit or URL, wait for 1 sec then hit another time
}

//http req - time taken for request + Time taken for response