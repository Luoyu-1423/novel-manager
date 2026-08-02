#ifndef DATA_MANAGER_H
#define DATA_MANAGER_H

#include <string>
#include <mutex>
#include <unordered_map>
#include "json.hpp"

using json = nlohmann::json;

class DataManager {
public:
    // 获取单例实例
    static DataManager& getInstance();
    
    // 初始化数据管理器
    bool init(const std::string& data_dir);
    
    // 读取JSON文件
    json readJson(const std::string& filename);
    
    // 写入JSON文件
    bool writeJson(const std::string& filename, const json& data);
    
    // 保存所有数据
    bool saveAll();
    
    // 获取模块数据
    json& getModule(const std::string& moduleName);
    
    // 保存模块数据
    bool saveModule(const std::string& moduleName);
    
    // 创建备份
    std::string createBackup();
    
    // 获取备份列表
    std::vector<std::string> getBackupList();
    
    // 清空备份
    bool clearBackups();
    
private:
    DataManager() = default;
    ~DataManager() = default;
    DataManager(const DataManager&) = delete;
    DataManager& operator=(const DataManager&) = delete;
    
    // 确保目录存在
    bool ensureDir(const std::string& path);
    
    std::string data_dir_;
    std::string backup_dir_;
    std::mutex mutex_;
    
    // 模块数据缓存
    std::unordered_map<std::string, json> modules_;
    
    // 模块文件名映射
    static const std::unordered_map<std::string, std::string> moduleFiles_;
};

#endif // DATA_MANAGER_H
