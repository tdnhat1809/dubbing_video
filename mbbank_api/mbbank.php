<?php 
date_default_timezone_set('Asia/Ho_Chi_Minh');

class MBBANKAPI {
    private $proxy = null;
    
    public function __construct($username, $password, $account, $generateImei, $proxy = null) {
        $this->username = $username;
        $this->password = $password;
        $this->account = $account;
        $this->generateImei = $generateImei;
        $this->proxy = $proxy;
    }

    // Static method to get random proxy from database (reuse ACB's proxy)
    public static function getRandomProxy($db)
    {
        try {
            $proxy_list = $db->site('proxy_acb');
            if (empty($proxy_list)) {
                return null;
            }
            
            // Split by lines and filter empty lines
            $proxies = array_filter(array_map('trim', explode("\n", $proxy_list)));
            if (empty($proxies)) {
                return null;
            }
            
            // Return random proxy
            return $proxies[array_rand($proxies)];
        } catch (Exception $e) {
            error_log("MBBANK Proxy Error: " . $e->getMessage());
            return null;
        }
    }
public function getcaptcha(){
    
$formatted_date = date('YmdHis');
if (empty($this->generateImei)) {
    $this->generateImei = $this->generateImei();
}
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://online.mbbank.com.vn/api/retail-web-internetbankingms/getCaptchaImage');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');

// Add proxy support
if (!empty($this->proxy)) {
    $this->configureProxy($ch, $this->proxy);
}
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'accept: application/json, text/plain, */*',
    'accept-language: vi,en-US;q=0.9,en;q=0.8',
    'app: MB_WEB',
    'authorization: Basic RU1CUkVUQUlMV0VCOlNEMjM0ZGZnMzQlI0BGR0AzNHNmc2RmNDU4NDNm',
    'content-type: application/json; charset=UTF-8',
    'deviceid: '.$this->generateImei,
    'elastic-apm-traceparent: 00-166aed8f0636818ccd3a9a1ae6186d7e-302300768ff68ab1-01',
    'origin: https://online.mbbank.com.vn',
    'priority: u=1, i',
    'referer: https://online.mbbank.com.vn/pl/login?returnUrl=%2F',
    'refno: '.$formatted_date,
    'sec-ch-ua: "Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
    'sec-ch-ua-mobile: ?0',
    'sec-ch-ua-platform: "Windows"',
    'sec-fetch-dest: empty',
    'sec-fetch-mode: cors',
    'sec-fetch-site: same-origin',
    'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
    'x-request-id: '.$formatted_date,
]);
$payload = array(
    "refNo" => $formatted_date,
    "deviceIdCommon" => $this->generateImei,
    "sessionId" => ""
);
//curl_setopt($ch, CURLOPT_COOKIE, 'MBAnalyticsaaaaaaaaaaaaaaaa_session_=FIJJDCJHELJBKHGINPPMCOGJDKGHMEHHFFFNILGPHLHBCGABFJLNOCDJKLLBGFHJLIMDEELIBFOMDHGFFGBAFGEIPILLJPBDFGNNBEMIPDJBJJIOAACODGINBEOIJFOE; _gid=GA1.3.269316932.1699111387; _gat_gtag_UA_205372863_2=1; JSESSIONID=D25BB8BEF49C21E58CBD5FF1B31A48F0; BIGipServerk8s_KrakenD_Api_gateway_pool_10781=1713111306.7466.0000; BIGipServerk8s_online_banking_pool_9712=3424387338.61477.0000; _ga_T1003L03HZ=GS1.1.1699186343.13.1.1699186349.0.0.0; _ga=GA1.3.1826251275.1698417945');
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

$response = curl_exec($ch);

curl_close($ch);
$data = json_decode($response, true);
return $data['imageString'];
}
public function giaicapcha($img, $type = 'mbbank')
{
    $dataPost = [
        "access_token" => "5513bea7c69eb106861a30c7132938c3",
        "type" => $type, // vcb, mbbank, bidv
        "img_base64" => $img
    ];

    $curl = curl_init();
    curl_setopt_array($curl, [
        CURLOPT_URL => "http://vncore.vn/api/captcha",
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => "",
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => "POST",
        CURLOPT_POSTFIELDS => json_encode($dataPost),
        CURLOPT_HTTPHEADER => [
            "Content-Type: application/json"
        ],
    ]);

    $result = curl_exec($curl);
    curl_close($curl);
    $response = json_decode($result, true);
    $capcha = $response['data']['captcha'];

    return $capcha;
}

 public function wasmEnc($data)
{
    $curl = curl_init();

    curl_setopt_array($curl, array(
        CURLOPT_URL => 'http://103.78.2.65:7222/mb/encrypt-data',//http://103.151.239.26:1872/enc
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => '',
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 0,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => 'POST',
        CURLOPT_POSTFIELDS => json_encode($data),
        CURLOPT_HTTPHEADER => array(
            'Content-Type: application/json'
        ),
    ));

    $response = curl_exec($curl);

    curl_close($curl);
    return json_decode($response, true);
}
public function callEncrypt($userId, $password, $deviceIdCommon, $captcha, $time) {
    $requestData = [
        'userId' => $userId,
        'password' => md5($password),
        'captcha' => $captcha,
        'ibAuthen2faString' => '',
        'sessionId' => null,
        'refNo' => $time,
        'deviceIdCommon' => $deviceIdCommon,
    ];
     $encrypt = $this->wasmEnc($requestData)['dataEnc'];
     return $encrypt;
}

public function dologin(){
$formatted_date = date('YmdHis');
$img_base64 = $this->getcaptcha();
$capcha = $this->giaicapcha($img_base64);
$deviceIdCommon = $this->generateImei;
$dataenc = $this->callEncrypt($this->username, $this->password, $deviceIdCommon, $capcha, $formatted_date);
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://online.mbbank.com.vn/api/retail_web/internetbanking/v2.0/doLogin');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');

// Add proxy support
if (!empty($this->proxy)) {
    $this->configureProxy($ch, $this->proxy);
}
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'accept: application/json, text/plain, */*',
    'accept-language: vi,en-US;q=0.9,en;q=0.8',
    'app: MB_WEB',
    'authorization: Basic RU1CUkVUQUlMV0VCOlNEMjM0ZGZnMzQlI0BGR0AzNHNmc2RmNDU4NDNm',
    'content-type: application/json; charset=UTF-8',
    'deviceid: '.$deviceIdCommon,
    'elastic-apm-traceparent: 00-087b9a00bf73672b7ea13c7497ee376d-6e2b01428e4f8bcb-01',
    'origin: https://online.mbbank.com.vn',
    'priority: u=1, i',
    'referer: https://online.mbbank.com.vn/pl/login?returnUrl=%2F',
    'refno: '.$this->username.'-'. $formatted_date.'-86956',
    'sec-ch-ua: "Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
    'sec-ch-ua-mobile: ?0',
    'sec-ch-ua-platform: "Windows"',
    'sec-fetch-dest: empty',
    'sec-fetch-mode: cors',
    'sec-fetch-site: same-origin',
    'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
    'x-request-id: '.$this->username.'-'. $formatted_date.'-86956',
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, '{"dataEnc":"'.$dataenc.'"}');

$response = curl_exec($ch);

curl_close($ch);
$data = json_decode($response, true);

// DEBUG LOGGING - Lưu thông tin để debug
$debug_info = [
    'timestamp' => date('Y-m-d H:i:s'),
    'username' => $this->username,
    'captcha' => $capcha,
    'deviceIdCommon' => $deviceIdCommon,
    'raw_response' => $response,
    'parsed_data' => $data,
    'curl_error' => curl_error($ch) ?: 'No curl error'
];
file_put_contents(realpath($_SERVER["DOCUMENT_ROOT"]) . '/mbbank_debug.json', json_encode($debug_info, JSON_PRETTY_PRINT));

return $data;
}
//  $tt = dologin($username, $formatted_date, $password, $refNo, $deviceIdCommon);
// print_r($tt);
public function laysodu($sessionId){
    $formatted_date = date('YmdHis');
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://online.mbbank.com.vn/api/retail-web-accountms/getBalance');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');

    // Add proxy support
    if (!empty($this->proxy)) {
        $this->configureProxy($ch, $this->proxy);
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Accept: application/json, text/plain, */*',
        'Accept-Language: vi,en;q=0.9,vi-VN;q=0.8,fr-FR;q=0.7,fr;q=0.6,en-US;q=0.5',
        'Authorization: Basic RU1CUkVUQUlMV0VCOlNEMjM0ZGZnMzQlI0BGR0AzNHNmc2RmNDU4NDNm',
        'Connection: keep-alive',
        'Content-Type: application/json; charset=UTF-8',
        'Origin: https://online.mbbank.com.vn',
        'Referer: https://online.mbbank.com.vn/information-account/source-account',
        'Sec-Fetch-Dest: empty',
        'Sec-Fetch-Mode: cors',
        'Sec-Fetch-Site: same-origin',
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'X-Request-Id: '.$this->username.'-'. $formatted_date.'-86956',
        'elastic-apm-traceparent: 00-a96a4400c4c072b99ad4731c5508c911-dfdd193af45a14b1-01',
        'sec-ch-ua: "Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
        'sec-ch-ua-mobile: ?0',
        'sec-ch-ua-platform: "Windows"',
    ]);
    $data = array(
        'sessionId' => $sessionId,
        'refNo' => $this->username.'-'. $formatted_date.'-86956',
        'deviceIdCommon' => $this->generateImei,
    );
    //curl_setopt($ch, CURLOPT_COOKIE, '_gid=GA1.3.269316932.1699111387; BIGipServerk8s_online_banking_pool_9712=3424387338.61477.0000; BIGipServerk8s_KrakenD_Api_gateway_pool_10781=1696334090.7466.0000; MBAnalyticsaaaaaaaaaaaaaaaa_session_=JKCFIDGEAKOILNAIJCPJANDNGBEELNCHEKICBGFHGICKPLHBPDALCJIMBPPODMIGGPFDJNOKAGKGNKDLIFOADBPJNFKJGFCHMDAOJGFAOIKNDBBDDHNFAFCCEBAIOJJB; JSESSIONID=DA6A875A5FACFED26E1F1F506794AC39; _gat_gtag_UA_205372863_2=1; _ga_T1003L03HZ=GS1.1.1699239791.18.1.1699239942.0.0.0; _ga=GA1.1.1826251275.1698417945');
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    
    $response = curl_exec($ch);
    
    curl_close($ch);
return $response;
}
public function get_current_balance($data, $stk) {
    foreach ($data['acct_list'] as $acct) {
        if ($acct['acctNo'] == $stk) {
            return $acct['currentBalance'];
        }
    }
    return null;
}

public function getlsgd($sessionId, $stk){
$formatted_date = date('YmdHis');
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://online.mbbank.com.vn/api/retail-transactionms/transactionms/get-account-transaction-history');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');

// Add proxy support
if (!empty($this->proxy)) {
    $this->configureProxy($ch, $this->proxy);
}
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'accept: application/json, text/plain, */*',
    'accept-language: vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5',
    'app: MB_WEB',
    'authorization: Basic RU1CUkVUQUlMV0VCOlNEMjM0ZGZnMzQlI0BGR0AzNHNmc2RmNDU4NDNm',
    'content-type: application/json; charset=UTF-8',
    'deviceid: '.$this->generateImei,
    'elastic-apm-traceparent: 00-1157536e11bac90bc0508060c97c25ad-d5dceaca24c84427-01',
    'origin: https://online.mbbank.com.vn',
    'priority: u=1, i',
    'referer: https://online.mbbank.com.vn/pl/login?logout=1',
    'refno: '.$this->username.'-'. $formatted_date.'-86956',
    'sec-ch-ua: "Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
    'sec-ch-ua-mobile: ?0',
    'sec-ch-ua-platform: "Windows"',
    'sec-fetch-dest: empty',
    'sec-fetch-mode: cors',
    'sec-fetch-site: same-origin',
    'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'x-request-id: '.$this->username.'-'. $formatted_date.'-86956',
]);
$data = array(
    'accountNo' => $stk,
    'fromDate' => date('d/m/Y', strtotime('-1 month')),
    'toDate' => date('d/m/Y'),
    'sessionId' => $sessionId,
    'refNo' => $this->username.'-'. $formatted_date.'-86956',
    'deviceIdCommon' => $this->generateImei,
);

curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

$response = curl_exec($ch);

curl_close($ch);
return $response;
}
    // function randomnumber
    function randomnumber($length)
    {
        $characters = '0123456789';
        $charactersLength = strlen($characters);
        $randomString = '';
        for ($i = 0; $i < $length; $i++) {
            $randomString .= $characters[rand(0, $charactersLength - 1)];
        }
        return $randomString;
    }

    // function random refNo
    public function refNo($username)
    {
        return $username . '-' . time();
    }

    // function userId
    public function userId($username)
    {
        return $username;
    }

    // function pass
    public function pass($password)
    {
        return $password;
    }

    // function random token 
    public function get_TOKEN()
    {
        return $this->generateRandomString(39);
    }
    // get imei
    public function generateImei()
    {
        return $this->generateRandomString(8) . '-' . $this->generateRandomString(4) . '-' . $this->generateRandomString(4) . '-' . $this->generateRandomString(4) . '-' . $this->generateRandomString(12);
    }

    public function generateRandomString($length = 20)
    {
        $characters = '0123456789abcdef';
        $charactersLength = strlen($characters);
        $randomString = '';
        for ($i = 0; $i < $length; $i++) {
            $randomString .= $characters[rand(0, $charactersLength - 1)];
        }
        return $randomString;
    }

    // High-level formatter for API response (giống ACB)
    public function getTransactionHistory($accountNo, $rows, $sessionId)
    {
        try {
            $raw_response = $this->getlsgd($sessionId, $accountNo);
            $transaction_data = json_decode($raw_response, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                return [
                    "status" => "error",
                    "msg" => "Không thể phân tích dữ liệu giao dịch",
                    "transactions" => []
                ];
            }

            // Check các trường hợp lỗi từ MBBANK
            if (isset($transaction_data['result']['message'])) {
                $message = $transaction_data['result']['message'];
                if ($message == 'Session Invalid') {
                    return [
                        "status" => "error",
                        "msg" => "Phiên đăng nhập đã hết hạn",
                        "transactions" => []
                    ];
                }
                if ($message == 'Customer is invalid') {
                    return [
                        "status" => "error",
                        "msg" => "Thông tin đăng nhập không chính xác",
                        "transactions" => []
                    ];
                }
            }

            if (!isset($transaction_data['transactionHistoryList']) || !is_array($transaction_data['transactionHistoryList'])) {
                return [
                    "status" => "error",
                    "msg" => "Không tìm thấy dữ liệu giao dịch",
                    "transactions" => []
                ];
            }

            $transactions = array_slice($transaction_data['transactionHistoryList'], 0, $rows);
            $formatted = [];
            
            foreach ($transactions as $index => $trans) {
                // Xác định loại giao dịch và số tiền
                $creditAmount = (float)($trans['creditAmount'] ?? 0);
                $debitAmount = (float)($trans['debitAmount'] ?? 0);
                
                if ($creditAmount > 0) {
                    $amount = $creditAmount;
                    $type = 'IN';
                } else {
                    $amount = $debitAmount;
                    $type = 'OUT';
                }
                
                // Format date giống ACB (yyyy-mm-dd)
                $transactionDate = $trans['transactionDate'] ?? '';
                if ($transactionDate && strpos($transactionDate, '/') !== false) {
                    // Convert from "07/08/2025 18:47:57" to "2025-08-07"
                    $dateParts = explode(' ', $transactionDate);
                    if (count($dateParts) > 0) {
                        $datePart = $dateParts[0]; // "07/08/2025"
                        $parts = explode('/', $datePart);
                        if (count($parts) === 3) {
                            $day = $parts[0];
                            $month = $parts[1];
                            $year = $parts[2];
                            $transactionDate = "$year-$month-$day";
                        }
                    }
                }
                
                $formatted[] = [
                    'transactionID' => $trans['refNo'] ?? ($index + 1),
                    'amount' => $amount,
                    'description' => $trans['description'] ?? '',
                    'transactionDate' => $transactionDate,
                    'type' => $type
                ];
            }

            return [
                "status" => "success",
                "msg" => "Thành công",
                "transactions" => $formatted
            ];
        } catch (\Exception $e) {
            return [
                "status" => "error",
                "msg" => "Lỗi: " . $e->getMessage(),
                "transactions" => []
            ];
        }
    }

    // Configure proxy settings for cURL (giống ACB)
    private function configureProxy($ch, $proxy)
    {
        try {
            // Support formats: ip:port, ip:port:user:pass, http://user:pass@ip:port
            if (strpos($proxy, 'http://') === 0 || strpos($proxy, 'https://') === 0) {
                // Format: http://user:pass@ip:port
                curl_setopt($ch, CURLOPT_PROXY, $proxy);
            } else {
                $parts = explode(':', $proxy);
                if (count($parts) >= 2) {
                    $ip = $parts[0];
                    $port = $parts[1];
                    curl_setopt($ch, CURLOPT_PROXY, $ip . ':' . $port);
                    
                    // If user and pass provided
                    if (count($parts) >= 4) {
                        $user = $parts[2];
                        $pass = $parts[3];
                        curl_setopt($ch, CURLOPT_PROXYUSERPWD, $user . ':' . $pass);
                    }
                }
            }
            
            curl_setopt($ch, CURLOPT_PROXYTYPE, CURLPROXY_HTTP);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 45); // Increase timeout for proxy
            
            // Debug log
            error_log("MBBANK using proxy: " . $proxy);
            
        } catch (Exception $e) {
            error_log("MBBANK Proxy Config Error: " . $e->getMessage());
        }
    }    
}



















