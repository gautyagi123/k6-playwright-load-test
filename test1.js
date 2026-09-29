import http from 'k6/http';
import { sleep } from 'k6';

export const options = { //load details in one javasciprt object

    vus: 3, //virtual users are defined as vus
    duration: '10s', //hitting endpoint for 10 second, multiple attempts can be made as one succes can happen in 2 sec any user will try hitting url for 10 sec

    thresholds : { // are used as checkpoint to validate our script
        'http_req_duration' : ['p(95)<100'], // avg p(95) should be completed before 100ms then it is pass otherwise script will show fail     http_req_duration ✗ 'p(95)<100' p(95)=341.39ms
        'http_req_failed' : ['rate < 0.5']    // rate ranges from 0 to 1, 0.5 means if 24 calls are made so if more than 12 fails it will throw an error
    }
    //ERRO[0011] thresholds on metrics 'http_req_duration' have been crossed 
}

// we need to export both object and function to work with each other otherwise access will be denied.

export default function() { //this method is use to run the test and execute it
    http.get("https://quickpizza.grafana.com/"); //hitting anything on browser is a get call
    sleep(1); //after 1 hit or URL, wait for 1 sec then hit another time
}


//to install k6 with node version use below
/*to install k6 package - $ npm install --save-dev @types/k6 is present in package.json  "devDependencies": {
    "@types/k6": "^1.7.0"
  }*/

//http req duration - time taken for request + Time taken for response
//http_reqs......................: 24  - 24 request are made by 3 users

//what is p(95) -- 95% request completed in or less that timestamp

/*how p(95) is calculated -- sort the values 
                         -- calcluate poistion : (95/100) * no of calls made
                        -- find the value of that position

 this all is done internally we dont need to do this*/

 /*{ expected_response:true }...: -- this will give report where status code is 200(Success) only 
 failed ones will be ignore [ex: 24 calls made 4 failed so it will show report for 20 success calls]
 avg=297.81ms min=249.5ms med=309.71ms max=353.45ms p(90)=339.32ms 
 p(95)=341.39ms
  */

 /*EXECUTION
    iteration_duration.............: -- time taken for function() block to execute
    avg is 1.48 as we have added 1 sec sleep so 1s + execution time 
    if we remove sleep then numbers in http req and execution would almost be same
    
    avg=1.48s    min=1.24s   med=1.31s    max=2.63s    p(90)=2.62s    p(95)=2.63s   
    iterations.....................: 21     2.002024/s
    vus............................: 3      min=3       max=3
    vus_max........................: 3  

 */

    /* to check https req failed make url as invalid in line 19 https://quickpizzasasa.graffafaana.com/
    http_req_failed................: 0.00%  0 out of 21
    http_reqs......................: 21     2.002024/s
    */


 