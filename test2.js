import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {

    //in stage block adding data in array with indexes format 
    stages: [ //in real time users came in phases 2 at moment then 5 so on 
        { duration: '4s', target: 2 }, //Ramp up to 2 users over 4 second gradually
        { duration: '5s', target: 5 }, //Stay at url for 5 seconds with 5 users existing 2 and 3 new 
        { duration: '3s', target: 0 }  //ramp down to 0 users gradually 
    ],
    thresholds: {
        'http_req_duration': ['p(95) < 400'],
        'http_req_failed': ['rate < 0.1'],  // rate ranges from 0 to 1, 0.1 means if 24 calls are made so if more than 2or3 fails it will trhow an error
        'checks': ['rate > 0.9'], //means validations must pass 90% or more, it is at suite level 
        'http_req_duration{name:api}': ['p(95) < 500'],
        'http_req_failed{name:api}': ['rate < 0.1'],
    }
}



export default function () {
    const resp = http.get("https://quickpizza.grafana.com/");
    check(resp, { //checks are used to validate our response, check comes from K6 and it takes 2 arguments one is response and other is object
        'status is 200': (resp) => { //(resp) => is a nameless function, for every nameless function we need to write what we are looking for ['status is 200': -its KEY]
            console.log(resp.status);
            return resp.status === 200;
        },
        'page contains pizza': (resp) => { // we can have multiple checks as second parameter is object 
            console.log(resp.body);
            return resp.body.includes("pizza111111");
        }
    })

    http.get("https://quickpizza.grafana.api.com/", {
        tags : {name: 'api'}
    });


    sleep(1); //after 1 hit or URL, wait for 1 sec then hit another time
}

//http req - time taken for request + Time taken for response