import { check } from 'k6';
import { browser } from 'k6/browser'; // this library allows UI to interact with load
import http from 'k6/http';
import { Trend } from 'k6/metrics'; // k6 has no native TTI web vital, so we track it as a custom Trend

const ttiTrend = new Trend('browser_custom_tti', true); // custom TTI approximated via Navigation Timing's domInteractive

// we cant test load test with 1000 users through UI using K6 with playwright but 
//we can put load via backend api load as done in e2e1.js and paralley we can check UI behaviour with k6 Playwright
// we will do k6 playwright with 3-4 users //

export const options = {
    scenarios: { //when we are integrating load with UI we need to build in scenarios
        ui: {   // this will run browser test, its UI load
            executor: 'shared-iterations', //shared iterations is 1 vus will iterate for 2 times if we dont mention then iteration will be random
            exec: 'browserTest',    // exec keyword is use to know which method to execute
            vus: 2,
            maxDuration: '1m',
            iterations: 2,
            options: {
                browser: {
                    type: 'chromium',
                    headless: 'false', // we can add SSL certificates inside this block and other arguments
                    // args: ['--no-sandbox', '--disable-gpu']
                }
            }
        },

        be: {  // this will put load thorugh url backend
            executor: 'constant-vus',
            exec: 'backendStress',
            vus: 10,
            duration: '1m'
        }
    },

    thresholds: {  //all these thresholds are for all application pages, if we need to check for specific we can add tag with url 
        'checks': ['rate == 1.0'],
        'browser_web_vital_cls': ['p(95) < 0.1'],
        'browser_web_vital_fcp': ['p(95) < 2000'],
        'browser_web_vital_fid': ['p(95) < 100'],
        'browser_web_vital_inp': ['p(95) < 200'],
        'browser_web_vital_lcp': ['p(95) < 3000'], //this lcp is for all pages(currently we have mentioned one only in below browserTest method but in real case we might have n number of pages so we will add url)
        'browser_web_vital_lcp{url:https://rahulshettyacademy.com/locatorspractice/}': ['p(95) < 3000'], //this lcp is for only mentioned page url
        'browser_web_vital_ttfb': ['p(95) < 1000'],
        'browser_http_req_duration': ['p(95) < 3000'],
    }
}


export async function browserTest() {

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("https://rahulshettyacademy.com/locatorspractice/");
    await page.locator("#inputUsername").type("rahul");
    console.log("Filling Password");
    await page.locator("input[placeholder='Password']").type("rahulshettyacademy");
    console.log("Attempting to submit form");
    await page.locator("button[type='Submit']").click();
    console.log("Navigation completed");

    await page.waitForTimeout(2000);

    // TTI approximation: time until DOM is interactive (main thread ready for input), since k6 has no built-in TTI vital
    const tti = await page.evaluate(() => {
        const [nav] = performance.getEntriesByType('navigation');
        return nav.domInteractive - nav.startTime;
    });
    ttiTrend.add(tti);

    const headerText = await page.locator("h1").first().innerText();

    check(headerText, {
        header: (text) => { //if we use curly braces we need to return the response
            return text.includes("Rahul Shetty");
        }
    })

    await context.close();
}

export async function backendStress() {
    const resp = http.get("https://rahulshettyacademy.com/locatorspractice/");

    check(resp, {
        'status is 200': (resp) => {
            return resp.status === 200;
        }
    })
}

/*web vitals in playwright with K6 reporting

//FCP — First Contentful Paint - 
Measures: Time until the first text/image is rendered

Your value: avg=1.48s → Good (threshold: < 1.8s is good, > 3s is poor)
Users see something on screen after ~1.5s

//LCP — Largest Contentful Paint
Measures: Time until the largest visible element or html content (hero image, main heading) is fully rendered

Your value: avg=1.94s → Good (threshold: < 2.5s is good, > 4s is poor)
This is the most important UX metric — users see main content in ~2s

//CLS — Cumulative Layout Shift
Measures: Visual stability (how much page elements shift unexpectedly during load)
we have links in website so how much shift(adjust) is there until its completly loaded is measured by CLS 
its measured in range not in time
Your value: 0.053 → Good (threshold: < 0.1 is good, > 0.25 is poor)
Score is unitless; lower = more stable layout

//FID — First Input Delay
Measures: Responsiveness to the first user interaction (click, tap, etc.)
ex: if we enter wrong cred then browser throws and javascript error, 
so how quickly javascript error is thrown is measured by FID
Your value: avg=700µs (~0.7ms) → Excellent (threshold: < 100ms is good)
Extremely fast — the main thread was essentially idle when users first interacted

//TTFB — Time to First Byte
Measures: Network latency + server processing time before the browser receives the first byte
same as FID but in case of FID error throws by browser in TTFB error comes from server(login failed)
Your value: avg=504ms → Needs improvement (threshold: < 800ms is good, but < 200ms is ideal)
High variance (min=305ms, max=704ms) suggests server-side inconsistency — worth investigating backend response times

//INP — Interaction to Next Paint
Measures: Overall responsiveness across ALL interactions (replaces FID as the primary metric)

Your value: avg=92ms → Good (threshold: < 200ms is good, > 500ms is poor)
Every click/tap rendered a response within ~92ms on average

*/