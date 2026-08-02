#pragma once

// Crow API 兼容层 - 基于 cpp-httplib 实现
// 目的：让原来用Crow的代码不用改，直接用httplib运行

#include "httplib.h"
#include <string>
#include <vector>
#include <utility>
#include <functional>

// 方法标签类型
struct method_tag {
    std::string method;
};

// 字面量运算符 "POST"_method - 必须在全局命名空间
inline method_tag operator"" _method(const char* str, size_t len) {
    return {std::string(str, len)};
}

namespace crow {

// 响应类
struct response {
    int code;
    std::string body;
    std::vector<std::pair<std::string, std::string>> headers;
    std::string content_type;
    
    response() : code(200), content_type("text/plain") {}
    response(int c) : code(c), content_type("text/plain") {}
    response(const std::string& b) : code(200), body(b), content_type("text/plain") {}
    response(int c, const std::string& b) : code(c), body(b), content_type("text/plain") {}
    
    void set_header(const std::string& key, const std::string& value) {
        headers.push_back({key, value});
        if (key == "Content-Type") {
            content_type = value;
        }
    }
    
    // 应用到httplib的response
    void apply_to(httplib::Response& res) const {
        res.status = code;
        res.set_content(body, content_type);
        for (auto& h : headers) {
            if (h.first != "Content-Type") {
                res.set_header(h.first, h.second);
            }
        }
    }
};

// 请求类
struct request {
    std::string body;
    std::string url;
    std::string method;
    
    static request from_httplib(const httplib::Request& req) {
        request r;
        r.body = req.body;
        r.url = req.path;
        r.method = req.method;
        return r;
    }
};

// 前置声明
class SimpleApp;

// 路由构建器
class RouteBuilder {
public:
    SimpleApp* app_;
    std::string path_;
    std::string method_;
    
    RouteBuilder(SimpleApp* app, const std::string& path) 
        : app_(app), path_(path), method_("GET") {}
    
    // 设置HTTP方法
    RouteBuilder& methods(method_tag tag) {
        method_ = tag.method;
        return *this;
    }
    
    // 注册handler - 无参数
    template<typename Func>
    auto operator()(Func func) -> decltype(func(), void()) {
        register_route(func);
    }
    
    // 注册handler - 有request参数
    template<typename Func>
    auto operator()(Func func) -> decltype(func(std::declval<request>()), void()) {
        register_route(func);
    }
    
    // 注册handler - 有string参数
    template<typename Func>
    auto operator()(Func func) -> decltype(func(std::string()), void()) {
        register_route_str(func);
    }
    
private:
    void register_route(std::function<response()> func);
    void register_route(std::function<response(const request&)> func);
    void register_route_str(std::function<response(const std::string&)> func);
};

// 简易服务器类
class SimpleApp {
public:
    httplib::Server server;
    int port_ = 5000;
    
    SimpleApp& port(int p) {
        port_ = p;
        return *this;
    }
    
    SimpleApp& multithreaded() {
        return *this;
    }
    
    void run() {
        server.listen("0.0.0.0", port_);
    }
    
    RouteBuilder route(const std::string& path) {
        return RouteBuilder(this, path);
    }
    
    // 注册路由 - GET 无参数
    void register_get(const std::string& path, std::function<response()> handler) {
        server.Get(path.c_str(), [handler](const httplib::Request&, httplib::Response& res) {
            auto crow_res = handler();
            crow_res.apply_to(res);
        });
    }
    
    // 注册路由 - GET 有request参数
    void register_get_request(const std::string& path, std::function<response(const request&)> handler) {
        server.Get(path.c_str(), [handler](const httplib::Request& req, httplib::Response& res) {
            auto crow_req = request::from_httplib(req);
            auto crow_res = handler(crow_req);
            crow_res.apply_to(res);
        });
    }
    
    // 注册路由 - POST 有request参数
    void register_post(const std::string& path, std::function<response(const request&)> handler) {
        server.Post(path.c_str(), [handler](const httplib::Request& req, httplib::Response& res) {
            auto crow_req = request::from_httplib(req);
            auto crow_res = handler(crow_req);
            crow_res.apply_to(res);
        });
    }
    
    // 注册路由 - GET 有一个字符串参数
    void register_get_str(const std::string& path, std::function<response(const std::string&)> handler) {
        std::string httplib_path = path;
        size_t pos = httplib_path.find("<string>");
        std::string param_name = "param";
        if (pos != std::string::npos) {
            httplib_path.replace(pos, 8, ":" + param_name);
        }
        
        server.Get(httplib_path.c_str(), [handler, param_name](const httplib::Request& req, httplib::Response& res) {
            std::string param = req.path_params.at(param_name);
            auto crow_res = handler(param);
            crow_res.apply_to(res);
        });
    }
};

// RouteBuilder的实现
inline void RouteBuilder::register_route(std::function<response()> func) {
    if (method_ == "GET") {
        app_->register_get(path_, func);
    } else {
        app_->register_post(path_, [func](const request&) { return func(); });
    }
}

inline void RouteBuilder::register_route(std::function<response(const request&)> func) {
    if (method_ == "GET") {
        app_->register_get_request(path_, func);
    } else {
        app_->register_post(path_, func);
    }
}

inline void RouteBuilder::register_route_str(std::function<response(const std::string&)> func) {
    app_->register_get_str(path_, func);
}

} // namespace crow

// CROW_ROUTE 宏
#define CROW_ROUTE(app, path) app.route(path)
