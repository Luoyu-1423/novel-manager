#include "data_manager.h"
#include <fstream>
#include <filesystem>
#include <ctime>
#include <iomanip>
#include <sstream>
#include <algorithm>
#include <iostream>

namespace fs = std::filesystem;

// 模块文件名映射
const std::unordered_map<std::string, std::string> DataManager::moduleFiles_ = {
    {"character", "character.json"},
    {"currency", "currency.json"},
    {"inventory", "inventory.json"},
    {"equipment", "equipment.json"},
    {"quests", "quests.json"},
    {"skills", "skills.json"},
    {"story", "story.json"},
    {"locations", "locations.json"},
    {"location_types", "location_types.json"},
    {"structure_levels", "structure_levels.json"},
    {"characters", "characters_v2.json"},
    {"relations", "relations.json"},
    {"relation_types", "relation_types.json"},
    {"custom_categories", "custom_categories.json"},
    {"custom_items", "custom_items.json"},
    {"settings", "settings.json"},
    {"templates", "templates.json"},
    {"item_library", "item_library.json"},
    {"custom_items_def", "custom_items_def.json"},
    {"equipment_slots", "equipment_slots.json"},
    {"currency_types", "currency_types.json"},
    {"quests_custom", "quests_custom.json"},
    {"quests_templates", "quests_templates.json"},
    {"skills_custom", "skills_custom.json"},
    {"character_templates", "character_templates.json"},
    {"buttons_config", "buttons_config.json"},
    {"export_order", "export_order.json"},
    {"stats", "stats.json"},
    {"item_categories", "item_categories.json"}
};

DataManager& DataManager::getInstance() {
    static DataManager instance;
    return instance;
}

bool DataManager::init(const std::string& data_dir) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    data_dir_ = data_dir;
    backup_dir_ = data_dir_ + "/backups";
    
    // 确保目录存在
    if (!ensureDir(data_dir_)) {
        std::cerr << "无法创建数据目录: " << data_dir_ << std::endl;
        return false;
    }
    
    if (!ensureDir(backup_dir_)) {
        std::cerr << "无法创建备份目录: " << backup_dir_ << std::endl;
        return false;
    }
    
    // 加载所有模块数据
    for (const auto& [moduleName, filename] : moduleFiles_) {
        std::string filepath = data_dir_ + "/" + filename;
        if (fs::exists(filepath)) {
            try {
                modules_[moduleName] = readJson(filename);
            } catch (const std::exception& e) {
                std::cerr << "加载模块失败: " << moduleName << ", 错误: " << e.what() << std::endl;
                modules_[moduleName] = json::object();
            }
        } else {
            modules_[moduleName] = json::object();
        }
    }
    
    std::cout << "数据管理器初始化完成，数据目录: " << data_dir_ << std::endl;
    return true;
}

bool DataManager::ensureDir(const std::string& path) {
    if (!fs::exists(path)) {
        std::error_code ec;
        fs::create_directories(path, ec);
        if (ec) {
            std::cerr << "创建目录失败: " << path << ", 错误: " << ec.message() << std::endl;
            return false;
        }
    }
    return true;
}

json DataManager::readJson(const std::string& filename) {
    std::string filepath = data_dir_ + "/" + filename;
    
    if (!fs::exists(filepath)) {
        return json::object();
    }
    
    try {
        std::ifstream file(filepath);
        if (file.is_open()) {
            json data;
            file >> data;
            return data;
        }
    } catch (const std::exception& e) {
        std::cerr << "读取JSON失败: " << filepath << ", 错误: " << e.what() << std::endl;
    }
    
    return json::object();
}

bool DataManager::writeJson(const std::string& filename, const json& data) {
    std::string filepath = data_dir_ + "/" + filename;
    
    // 确保目录存在
    std::string dir = fs::path(filepath).parent_path().string();
    if (!ensureDir(dir)) {
        return false;
    }
    
    try {
        std::ofstream file(filepath);
        if (file.is_open()) {
            file << data.dump(4);
            return true;
        }
    } catch (const std::exception& e) {
        std::cerr << "写入JSON失败: " << filepath << ", 错误: " << e.what() << std::endl;
    }
    
    return false;
}

bool DataManager::saveAll() {
    std::lock_guard<std::mutex> lock(mutex_);
    
    bool success = true;
    
    for (const auto& [moduleName, filename] : moduleFiles_) {
        if (modules_.count(moduleName)) {
            if (!writeJson(filename, modules_[moduleName])) {
                success = false;
            }
        }
    }
    
    return success;
}

json& DataManager::getModule(const std::string& moduleName) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (!modules_.count(moduleName)) {
        modules_[moduleName] = json::object();
    }
    
    return modules_[moduleName];
}

bool DataManager::saveModule(const std::string& moduleName) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (!moduleFiles_.count(moduleName) || !modules_.count(moduleName)) {
        return false;
    }
    
    return writeJson(moduleFiles_.at(moduleName), modules_.at(moduleName));
}

std::string DataManager::createBackup() {
    std::lock_guard<std::mutex> lock(mutex_);
    
    // 生成时间戳
    std::time_t now = std::time(nullptr);
    std::tm* tm = std::localtime(&now);
    std::ostringstream oss;
    oss << std::put_time(tm, "%Y%m%d_%H%M%S");
    std::string timestamp = oss.str();
    
    std::string backupPath = backup_dir_ + "/backup_" + timestamp;
    
    if (!ensureDir(backupPath)) {
        return "";
    }
    
    // 复制所有数据文件
    try {
        for (const auto& entry : fs::directory_iterator(data_dir_)) {
            if (entry.is_regular_file() && entry.path().extension() == ".json") {
                fs::copy(entry.path(), backupPath + "/" + entry.path().filename().string());
            }
        }
        return backupPath;
    } catch (const std::exception& e) {
        std::cerr << "创建备份失败: " << e.what() << std::endl;
        return "";
    }
}

std::vector<std::string> DataManager::getBackupList() {
    std::vector<std::string> backups;
    
    if (!fs::exists(backup_dir_)) {
        return backups;
    }
    
    try {
        for (const auto& entry : fs::directory_iterator(backup_dir_)) {
            if (entry.is_directory()) {
                backups.push_back(entry.path().filename().string());
            }
        }
    } catch (const std::exception& e) {
        // 忽略错误
    }
    
    // 按名称排序（最新的在前）
    std::sort(backups.rbegin(), backups.rend());
    
    return backups;
}

bool DataManager::clearBackups() {
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (!fs::exists(backup_dir_)) {
        return true;
    }
    
    try {
        for (const auto& entry : fs::directory_iterator(backup_dir_)) {
            if (entry.is_directory()) {
                fs::remove_all(entry.path());
            }
        }
        return true;
    } catch (const std::exception& e) {
        std::cerr << "清空备份失败: " << e.what() << std::endl;
        return false;
    }
}
