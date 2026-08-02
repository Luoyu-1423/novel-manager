#include <iostream>
#include <string>
#include <sstream>
#include <fstream>
#include "crow_all.h"
#include "data_manager.h"

#include <unistd.h>
#include <linux/limits.h>

#ifndef PATH_MAX
#define PATH_MAX 4096
#endif

// 全局基础路径（可执行文件所在目录）
std::string BASE_DIR;

// 获取可执行文件所在目录
std::string getExecutableDir() {
    char result[PATH_MAX];
    
    // 方案1：使用 /proc/self/exe（Linux）
    ssize_t count = readlink("/proc/self/exe", result, PATH_MAX);
    if (count != -1 && count > 0) {
        std::string path(result, count);
        size_t pos = path.find_last_of('/');
        if (pos != std::string::npos) {
            return path.substr(0, pos);
        }
    }
    
    // 方案2：使用 argv[0]（需要在 main 中设置，这里作为备用）
    // 方案3：使用当前工作目录
    if (getcwd(result, PATH_MAX) != NULL) {
        return std::string(result);
    }
    
    // 方案4：使用相对路径
    return ".";
}

// 获取完整路径
std::string getFullPath(const std::string& relativePath) {
    return BASE_DIR + "/" + relativePath;
}

// 版本号
const std::string VERSION = "3.1.0";

// 工具函数：解析请求体为JSON
json parseBody(const crow::request& req) {
    try {
        return json::parse(req.body);
    } catch (const std::exception& e) {
        return json::object();
    }
}

// 工具函数：生成JSON响应
crow::response jsonResponse(const json& data) {
    crow::response res(data.dump());
    res.set_header("Content-Type", "application/json; charset=utf-8");
    return res;
}

// 工具函数：生成成功响应
crow::response successResponse(const json& data) {
    json result;
    result["success"] = true;
    result["data"] = data;
    return jsonResponse(result);
}

// 工具函数：生成成功消息
crow::response successMessage(const std::string& message) {
    json result;
    result["success"] = true;
    result["message"] = message;
    return jsonResponse(result);
}

// 工具函数：生成错误响应
crow::response errorResponse(const std::string& message, int code = 400) {
    json result;
    result["success"] = false;
    result["error"] = message;
    crow::response res(code, result.dump());
    res.set_header("Content-Type", "application/json; charset=utf-8");
    return res;
}

// 工具函数：将inventory对象转换为数组格式
json convertInventoryToArray(const json& inventory) {
    json::array_t inv_arr;
    if (inventory.is_object()) {
        for (auto& [key, value] : inventory.items()) {
            json item;
            if (value.is_number()) {
                item["id"] = key;
                item["name"] = key;
                item["quantity"] = value.get<int>();
                item["icon"] = "📦";
            } else if (value.is_object()) {
                item = value;
                if (!item.contains("id")) {
                    item["id"] = key;
                }
                if (!item.contains("quantity")) {
                    item["quantity"] = 1;
                }
            }
            inv_arr.push_back(item);
        }
    }
    return inv_arr;
}

// ==================== 导出辅助函数 ====================

// 获取导出详细模式设置
bool getExportDetailMode() {
    auto& settings = DataManager::getInstance().getModule("settings");
    if (settings.contains("export_detail")) {
        return settings["export_detail"].get<bool>();
    }
    return false; // 默认简略模式
}

// 导出角色信息
std::string exportCharacter(bool detailed) {
    std::string result = "【👤 角色信息】\n";
    auto& character = DataManager::getInstance().getModule("character");
    
    if (character.is_object() && !character.empty()) {
        std::string name = character.value("name", "未命名角色");
        result += "名称: " + name + "\n";
        
        if (detailed) {
            // 导出所有属性
            for (auto& [key, value] : character.items()) {
                if (key == "name") continue;
                if (value.is_string()) {
                    result += key + ": " + value.get<std::string>() + "\n";
                } else if (value.is_number_integer()) {
                    result += key + ": " + std::to_string(value.get<int>()) + "\n";
                } else if (value.is_number_float()) {
                    result += key + ": " + std::to_string(value.get<double>()) + "\n";
                }
            }
        }
    } else {
        result += "暂无角色信息\n";
    }
    result += "\n";
    return result;
}

// 导出货币
std::string exportCurrency(bool detailed) {
    std::string result = "【💰 货币】\n";
    auto& currency = DataManager::getInstance().getModule("currency");
    
    int count = 0;
    if (currency.is_object() && !currency.empty()) {
        for (auto& [key, value] : currency.items()) {
            std::string name;
            std::string icon = "💰";
            long long amount = 0;
            
            if (value.is_object()) {
                // 新格式：对象，包含name、icon、amount等字段
                name = value.value("name", key);
                if (value.contains("icon") && value["icon"].is_string()) {
                    icon = value["icon"].get<std::string>();
                }
                if (value.contains("amount") && value["amount"].is_number()) {
                    amount = value["amount"].get<long long>();
                }
            } else if (value.is_number()) {
                // 旧格式：数字，key是货币类型，value是数量
                name = key;
                amount = value.get<long long>();
            } else {
                // 其他格式
                name = key;
            }
            
            result += icon + " " + name + ": " + std::to_string(amount) + "\n";
            count++;
            
            if (detailed && value.is_object() && value.contains("description") && 
                value["description"].is_string() && !value["description"].get<std::string>().empty()) {
                result += "  描述: " + value["description"].get<std::string>() + "\n";
            }
        }
    }
    
    if (count == 0) {
        result += "暂无货币数据\n";
    }
    result += "\n";
    return result;
}

// 导出背包物品
std::string exportInventory(bool detailed) {
    std::string result = "【🎒 背包物品】\n";
    auto& inventory = DataManager::getInstance().getModule("inventory");
    
    int count = 0;
    if (inventory.is_array()) {
        for (auto& item : inventory) {
            if (!item.is_object()) continue;
            
            std::string name = item.value("name", "未命名");
            std::string icon = "📦";
            if (item.contains("icon") && item["icon"].is_string()) {
                icon = item["icon"].get<std::string>();
            }
            int quantity = item.value("quantity", 1);
            
            result += icon + " " + name + " x" + std::to_string(quantity) + "\n";
            count++;
            
            if (detailed) {
                if (item.contains("description") && item["description"].is_string() && 
                    !item["description"].get<std::string>().empty()) {
                    result += "  描述: " + item["description"].get<std::string>() + "\n";
                }
                if (item.contains("category_id") && item["category_id"].is_string() && 
                    !item["category_id"].get<std::string>().empty()) {
                    result += "  分类: " + item["category_id"].get<std::string>() + "\n";
                }
                if (item.contains("type") && item["type"].is_string() && 
                    !item["type"].get<std::string>().empty()) {
                    result += "  类型: " + item["type"].get<std::string>() + "\n";
                }
                if (item.contains("id") && item["id"].is_string() && 
                    !item["id"].get<std::string>().empty()) {
                    result += "  ID: " + item["id"].get<std::string>() + "\n";
                }
            }
        }
    } else if (inventory.is_object()) {
        // 兼容对象格式
        for (auto& [id, item] : inventory.items()) {
            if (!item.is_object()) continue;
            
            std::string name = item.value("name", id);
            std::string icon = "📦";
            if (item.contains("icon") && item["icon"].is_string()) {
                icon = item["icon"].get<std::string>();
            }
            int quantity = item.value("quantity", 1);
            
            result += icon + " " + name + " x" + std::to_string(quantity) + "\n";
            count++;
            
            if (detailed) {
                if (item.contains("description") && item["description"].is_string() && 
                    !item["description"].get<std::string>().empty()) {
                    result += "  描述: " + item["description"].get<std::string>() + "\n";
                }
                result += "  ID: " + id + "\n";
            }
        }
    }
    
    if (count == 0) {
        result += "背包为空\n";
    }
    result += "\n";
    return result;
}

// 导出装备
std::string exportEquipment(bool detailed) {
    std::string result = "【⚔️ 装备】\n";
    auto& equipment = DataManager::getInstance().getModule("equipment");
    
    int count = 0;
    if (equipment.is_object() && !equipment.empty()) {
        for (auto& [slot, item] : equipment.items()) {
            if (!item.is_object()) continue;
            
            std::string name = item.value("name", "未命名装备");
            std::string icon = "⚔️";
            if (item.contains("icon") && item["icon"].is_string()) {
                icon = item["icon"].get<std::string>();
            }
            
            result += "[" + slot + "] " + icon + " " + name + "\n";
            count++;
            
            if (detailed) {
                if (item.contains("description") && item["description"].is_string() && 
                    !item["description"].get<std::string>().empty()) {
                    result += "  描述: " + item["description"].get<std::string>() + "\n";
                }
                if (item.contains("id") && item["id"].is_string() && 
                    !item["id"].get<std::string>().empty()) {
                    result += "  ID: " + item["id"].get<std::string>() + "\n";
                }
            }
        }
    }
    
    if (count == 0) {
        result += "暂无装备\n";
    }
    result += "\n";
    return result;
}

// 导出技能
std::string exportSkills(bool detailed) {
    std::string result = "【✨ 技能】\n";
    auto& skills = DataManager::getInstance().getModule("skills");
    
    int count = 0;
    if (skills.is_array()) {
        for (auto& skill : skills) {
            if (!skill.is_object()) continue;
            
            std::string name = skill.value("name", "未命名技能");
            std::string icon = "✨";
            if (skill.contains("icon") && skill["icon"].is_string()) {
                icon = skill["icon"].get<std::string>();
            }
            
            result += icon + " " + name + "\n";
            count++;
            
            if (detailed) {
                if (skill.contains("description") && skill["description"].is_string() && 
                    !skill["description"].get<std::string>().empty()) {
                    result += "  描述: " + skill["description"].get<std::string>() + "\n";
                }
                if (skill.contains("power") && skill["power"].is_number()) {
                    result += "  威力: " + std::to_string(skill["power"].get<int>()) + "\n";
                }
                if (skill.contains("cost") && skill["cost"].is_number()) {
                    result += "  消耗: " + std::to_string(skill["cost"].get<int>()) + "\n";
                }
                if (skill.contains("cooldown") && skill["cooldown"].is_number()) {
                    result += "  冷却: " + std::to_string(skill["cooldown"].get<int>()) + "\n";
                }
                if (skill.contains("type") && skill["type"].is_string() && 
                    !skill["type"].get<std::string>().empty()) {
                    result += "  类型: " + skill["type"].get<std::string>() + "\n";
                }
                if (skill.contains("id") && skill["id"].is_string() && 
                    !skill["id"].get<std::string>().empty()) {
                    result += "  ID: " + skill["id"].get<std::string>() + "\n";
                }
            }
        }
    } else if (skills.is_object()) {
        for (auto& [id, skill] : skills.items()) {
            if (!skill.is_object()) continue;
            
            std::string name = skill.value("name", id);
            std::string icon = "✨";
            if (skill.contains("icon") && skill["icon"].is_string()) {
                icon = skill["icon"].get<std::string>();
            }
            
            result += icon + " " + name + "\n";
            count++;
            
            if (detailed) {
                if (skill.contains("description") && skill["description"].is_string() && 
                    !skill["description"].get<std::string>().empty()) {
                    result += "  描述: " + skill["description"].get<std::string>() + "\n";
                }
                result += "  ID: " + id + "\n";
            }
        }
    }
    
    if (count == 0) {
        result += "暂无技能\n";
    }
    result += "\n";
    return result;
}

// 导出任务
std::string exportQuests(bool detailed) {
    std::string result = "【📜 任务】\n";
    auto& quests = DataManager::getInstance().getModule("quests");
    
    int count = 0;
    if (quests.is_array()) {
        for (auto& quest : quests) {
            if (!quest.is_object()) continue;
            
            std::string name = quest.value("name", "未命名任务");
            std::string status = quest.value("status", "未开始");
            
            result += "📜 " + name + " (" + status + ")\n";
            count++;
            
            if (detailed) {
                if (quest.contains("description") && quest["description"].is_string() && 
                    !quest["description"].get<std::string>().empty()) {
                    result += "  描述: " + quest["description"].get<std::string>() + "\n";
                }
                if (quest.contains("reward") && quest["reward"].is_string() && 
                    !quest["reward"].get<std::string>().empty()) {
                    result += "  奖励: " + quest["reward"].get<std::string>() + "\n";
                }
                if (quest.contains("id") && quest["id"].is_string() && 
                    !quest["id"].get<std::string>().empty()) {
                    result += "  ID: " + quest["id"].get<std::string>() + "\n";
                }
            }
        }
    }
    
    if (count == 0) {
        result += "暂无任务\n";
    }
    result += "\n";
    return result;
}

// 导出剧情
std::string exportStory(bool detailed) {
    std::string result = "【📖 剧情】\n";
    auto& story = DataManager::getInstance().getModule("story");
    
    int count = 0;
    if (story.is_array()) {
        for (auto& chapter : story) {
            if (!chapter.is_object()) continue;
            
            std::string title = chapter.value("title", "未命名章节");
            result += "📖 " + title + "\n";
            count++;
            
            if (detailed) {
                if (chapter.contains("content") && chapter["content"].is_string() && 
                    !chapter["content"].get<std::string>().empty()) {
                    std::string content = chapter["content"].get<std::string>();
                    // 只显示前100字
                    if (content.length() > 100) {
                        content = content.substr(0, 100) + "...";
                    }
                    result += "  内容: " + content + "\n";
                }
                if (chapter.contains("id") && chapter["id"].is_string() && 
                    !chapter["id"].get<std::string>().empty()) {
                    result += "  ID: " + chapter["id"].get<std::string>() + "\n";
                }
            }
        }
    }
    
    if (count == 0) {
        result += "暂无剧情\n";
    }
    result += "\n";
    return result;
}

// 导出地图地点
std::string exportLocations(bool detailed) {
    std::string result = "【🗺️ 地图地点】\n";
    auto& locations = DataManager::getInstance().getModule("locations");
    
    int count = 0;
    if (locations.is_array()) {
        for (auto& loc : locations) {
            if (!loc.is_object()) continue;
            
            std::string name = loc.value("name", "未命名地点");
            std::string icon = "📍";
            if (loc.contains("icon") && loc["icon"].is_string()) {
                icon = loc["icon"].get<std::string>();
            }
            
            result += icon + " " + name + "\n";
            count++;
            
            if (detailed) {
                if (loc.contains("description") && loc["description"].is_string() && 
                    !loc["description"].get<std::string>().empty()) {
                    result += "  描述: " + loc["description"].get<std::string>() + "\n";
                }
                if (loc.contains("id") && loc["id"].is_string() && 
                    !loc["id"].get<std::string>().empty()) {
                    result += "  ID: " + loc["id"].get<std::string>() + "\n";
                }
            }
        }
    }
    
    if (count == 0) {
        result += "暂无地点\n";
    }
    result += "\n";
    return result;
}

// 导出人物关系
std::string exportRelations(bool detailed) {
    std::string result = "【👥 人物关系】\n";
    auto& relations = DataManager::getInstance().getModule("relations");
    
    int count = 0;
    if (relations.is_array()) {
        for (auto& rel : relations) {
            if (!rel.is_object()) continue;
            
            std::string from = rel.value("from", "?");
            std::string to = rel.value("to", "?");
            std::string type = rel.value("type", "关系");
            
            result += from + " → " + to + ": " + type + "\n";
            count++;
            
            if (detailed) {
                if (rel.contains("description") && rel["description"].is_string() && 
                    !rel["description"].get<std::string>().empty()) {
                    result += "  描述: " + rel["description"].get<std::string>() + "\n";
                }
                if (rel.contains("id") && rel["id"].is_string() && 
                    !rel["id"].get<std::string>().empty()) {
                    result += "  ID: " + rel["id"].get<std::string>() + "\n";
                }
            }
        }
    }
    
    if (count == 0) {
        result += "暂无关系\n";
    }
    result += "\n";
    return result;
}

// 导出物品库
std::string exportItemLibrary(bool detailed) {
    std::string result = "【📦 物品库】\n";
    auto& itemLib = DataManager::getInstance().getModule("item_library");
    
    int count = 0;
    if (itemLib.is_array()) {
        for (auto& item : itemLib) {
            if (!item.is_object()) continue;
            
            std::string name = item.value("name", "未命名");
            std::string icon = "📦";
            if (item.contains("icon") && item["icon"].is_string()) {
                icon = item["icon"].get<std::string>();
            }
            
            result += icon + " " + name;
            
            if (item.contains("category_id") && item["category_id"].is_string() && 
                !item["category_id"].get<std::string>().empty()) {
                result += " [" + item["category_id"].get<std::string>() + "]";
            }
            result += "\n";
            count++;
            
            if (detailed) {
                if (item.contains("description") && item["description"].is_string() && 
                    !item["description"].get<std::string>().empty()) {
                    result += "  描述: " + item["description"].get<std::string>() + "\n";
                }
                if (item.contains("type") && item["type"].is_string() && 
                    !item["type"].get<std::string>().empty()) {
                    result += "  类型: " + item["type"].get<std::string>() + "\n";
                }
                if (item.contains("id") && item["id"].is_string() && 
                    !item["id"].get<std::string>().empty()) {
                    result += "  ID: " + item["id"].get<std::string>() + "\n";
                }
            }
        }
    } else if (itemLib.is_object()) {
        for (auto& [id, item] : itemLib.items()) {
            if (!item.is_object()) continue;
            
            std::string name = item.value("name", "未命名");
            std::string icon = "📦";
            if (item.contains("icon") && item["icon"].is_string()) {
                icon = item["icon"].get<std::string>();
            }
            
            result += icon + " " + name + "\n";
            count++;
            
            if (detailed) {
                if (item.contains("description") && item["description"].is_string() && 
                    !item["description"].get<std::string>().empty()) {
                    result += "  描述: " + item["description"].get<std::string>() + "\n";
                }
                result += "  ID: " + id + "\n";
            }
        }
    }
    
    if (count == 0) {
        result += "物品库为空\n";
    }
    result += "\n";
    return result;
}

// 导出自定义数据
std::string exportCustom(bool detailed, const std::string& categoryId = "", const std::string& categoryName = "") {
    std::string result;
    
    // 获取分类名称
    std::string catName = categoryName;
    if (catName.empty() && !categoryId.empty()) {
        auto& categories = DataManager::getInstance().getModule("custom_categories");
        if (categories.is_object() && categories.contains(categoryId)) {
            auto& cat = categories[categoryId];
            if (cat.is_object()) {
                catName = cat.value("name", categoryId);
            }
        }
    }
    
    // 标题
    if (!categoryId.empty()) {
        result = "【📋 自定义数据 - " + catName + "】\n";
    } else {
        result = "【📋 自定义数据】\n";
    }
    
    auto& items = DataManager::getInstance().getModule("custom_items");
    
    int count = 0;
    
    // 支持对象格式和数组格式
    if (items.is_object()) {
        for (auto& [key, item] : items.items()) {
            if (!item.is_object()) continue;
            
            // 如果指定了分类，只导出该分类的条目
            if (!categoryId.empty()) {
                std::string itemCatId = item.value("category_id", "");
                if (itemCatId != categoryId) continue;
            }
            
            std::string title = item.value("title", item.value("name", "未命名"));
            result += "📋 " + title + "\n";
            count++;
            
            if (detailed) {
                // 导出所有字段
                for (auto& [k, v] : item.items()) {
                    if (k == "title" || k == "name" || k == "category_id") continue;
                    if (v.is_string()) {
                        result += "  " + k + ": " + v.get<std::string>() + "\n";
                    } else if (v.is_number_integer()) {
                        result += "  " + k + ": " + std::to_string(v.get<int>()) + "\n";
                    }
                }
                // 添加ID
                std::string itemId = item.value("id", key);
                if (!itemId.empty()) {
                    result += "  ID: " + itemId + "\n";
                }
            }
        }
    } else if (items.is_array()) {
        for (auto& item : items) {
            if (!item.is_object()) continue;
            
            // 如果指定了分类，只导出该分类的条目
            if (!categoryId.empty()) {
                std::string itemCatId = item.value("category_id", "");
                if (itemCatId != categoryId) continue;
            }
            
            std::string title = item.value("title", item.value("name", "未命名"));
            result += "📋 " + title + "\n";
            count++;
            
            if (detailed) {
                // 导出所有字段
                for (auto& [k, v] : item.items()) {
                    if (k == "title" || k == "name" || k == "category_id") continue;
                    if (v.is_string()) {
                        result += "  " + k + ": " + v.get<std::string>() + "\n";
                    } else if (v.is_number_integer()) {
                        result += "  " + k + ": " + std::to_string(v.get<int>()) + "\n";
                    }
                }
                if (item.contains("id") && item["id"].is_string() && 
                    !item["id"].get<std::string>().empty()) {
                    result += "  ID: " + item["id"].get<std::string>() + "\n";
                }
            }
        }
    }
    
    if (count == 0) {
        result += "暂无数据\n";
    }
    result += "\n";
    return result;
}



int main(int argc, char* argv[]) {
    crow::SimpleApp app;
    
    // 初始化基础路径
    // 优先使用命令行参数指定的目录
    if (argc > 1) {
        BASE_DIR = argv[1];
        std::cout << "使用命令行指定目录: " << BASE_DIR << std::endl;
    } else {
        BASE_DIR = getExecutableDir();
        std::cout << "程序目录: " << BASE_DIR << std::endl;
    }
    std::cout << "程序目录: " << BASE_DIR << std::endl;
    std::cout << "模板路径: " << getFullPath("templates/index.html") << std::endl;
    
    // 检查关键文件是否存在
    bool filesOk = true;
    std::string templatePath = getFullPath("templates/index.html");
    std::string cssPath = getFullPath("static/css/style.css");
    std::string jsPath = getFullPath("static/js/app.js");
    
    std::ifstream testTemplate(templatePath);
    if (!testTemplate.is_open()) {
        std::cerr << "警告：找不到模板文件: " << templatePath << std::endl;
        std::cerr << "请确保在正确的目录下运行程序" << std::endl;
        filesOk = false;
    }
    testTemplate.close();
    
    if (!filesOk) {
        std::cerr << "警告：部分文件缺失，程序可能无法正常显示页面" << std::endl;
        std::cerr << "请检查程序目录是否正确" << std::endl;
    }
    
    // 初始化数据管理器
    std::string data_dir = getFullPath("data");
    DataManager::getInstance().init(data_dir);
    
    
    // 确保物品库是数组格式
    auto& itemLibrary = DataManager::getInstance().getModule("item_library");
    if (!itemLibrary.is_array()) {
        itemLibrary = json::array();
        DataManager::getInstance().saveModule("item_library");
    }
    // 初始化默认装备槽位（如果为空）- 已移除，改为手动添加
    // auto& equipmentSlots = DataManager::getInstance().getModule("equipment_slots");
    // if (equipmentSlots.empty() || !equipmentSlots.is_object() || equipmentSlots.size() == 0) {
    //     json defaultSlots;
    //     defaultSlots["weapon"] = {
    //         {"name", "武器"},
    //         {"icon", "⚔️"},
    //         {"slot_id", "weapon"}
    //     };
    //     defaultSlots["armor"] = {
    //         {"name", "护甲"},
    //         {"icon", "🛡️"},
    //         {"slot_id", "armor"}
    //     };
    //     defaultSlots["accessory"] = {
    //         {"name", "饰品"},
    //         {"icon", "💍"},
    //         {"slot_id", "accessory"}
    //     };
    //     equipmentSlots = defaultSlots;
    //     DataManager::getInstance().saveModule("equipment_slots");
    //     std::cout << "已初始化默认装备槽位，共3个" << std::endl;
    // }
    
    // 迁移：移除旧版本的默认装备槽位（weapon, armor, accessory）
    {
        auto& equipmentSlots = DataManager::getInstance().getModule("equipment_slots");
        if (equipmentSlots.is_object()) {
            bool removed = false;
            // 检查并移除默认的三个槽位
            if (equipmentSlots.contains("weapon")) {
                equipmentSlots.erase("weapon");
                removed = true;
            }
            if (equipmentSlots.contains("armor")) {
                equipmentSlots.erase("armor");
                removed = true;
            }
            if (equipmentSlots.contains("accessory")) {
                equipmentSlots.erase("accessory");
                removed = true;
            }
            if (removed) {
                DataManager::getInstance().saveModule("equipment_slots");
                std::cout << "已移除默认装备槽位" << std::endl;
            }
        }
    }
    
    std::cout << "========================================" << std::endl;
    std::cout << "  小说数据管理器 v" << VERSION << std::endl;
    std::cout << "  C++ 版本" << std::endl;
    std::cout << "========================================" << std::endl;
    std::cout << "数据目录: " << data_dir << std::endl;
    std::cout << "服务器启动中..." << std::endl;
    std::cout << "访问地址: http://127.0.0.1:5000" << std::endl;
    std::cout << "按 Ctrl+C 停止服务器" << std::endl;
    std::cout << "========================================" << std::endl;
    
    // ==================== 基础路由 ====================
    
    // 首页
    CROW_ROUTE(app, "/")([](){
        std::string filepath = getFullPath("templates/index.html");
        std::ifstream file(filepath);
        if (file.is_open()) {
            std::stringstream buffer;
            buffer << file.rdbuf();
            crow::response res(buffer.str());
            res.set_header("Content-Type", "text/html; charset=utf-8");
            return res;
        }
        // 返回详细的错误信息帮助排查
        std::string errorMsg = "<h1>404 - 模板文件未找到</h1>";
        errorMsg += "<p>查找路径: " + filepath + "</p>";
        errorMsg += "<p>程序目录: " + BASE_DIR + "</p>";
        errorMsg += "<p>请确保 templates/index.html 文件存在于程序目录下</p>";
        errorMsg += "<p>如果路径不对，可以使用命令行参数指定目录: ./novel_manager /path/to/dir</p>";
        return crow::response(404, errorMsg);
    });
    
    // 静态文件 - CSS
    CROW_ROUTE(app, "/static/css/<string>")([](const std::string& filename){
        std::string filepath = getFullPath("static/css/") + filename;
        std::ifstream file(filepath);
        if (file.is_open()) {
            std::stringstream buffer;
            buffer << file.rdbuf();
            crow::response res(buffer.str());
            res.set_header("Content-Type", "text/css; charset=utf-8");
            return res;
        }
        return crow::response(404, "Not Found");
    });
    
    // 静态文件 - JS
    CROW_ROUTE(app, "/static/js/<string>")([](const std::string& filename){
        std::string filepath = getFullPath("static/js/") + filename;
        std::ifstream file(filepath);
        if (file.is_open()) {
            std::stringstream buffer;
            buffer << file.rdbuf();
            crow::response res(buffer.str());
            res.set_header("Content-Type", "application/javascript; charset=utf-8");
            return res;
        }
        return crow::response(404, "Not Found");
    });
    
    // 版本信息
    CROW_ROUTE(app, "/api/version")([](){
        json data;
        data["version"] = VERSION;
        data["build"] = "C++ Edition";
        return jsonResponse(data);
    });
    
    // 测试接口
    CROW_ROUTE(app, "/api/test")([](){
        json data;
        data["status"] = "ok";
        data["message"] = "服务器运行正常";
        return jsonResponse(data);
    });
    
    // 初始化并获取所有基础数据
    CROW_ROUTE(app, "/api/init")([](){
        json result;
        result["success"] = true;
        result["version"] = VERSION;
        result["character"] = DataManager::getInstance().getModule("character");
        
        // 转换inventory为数组格式
        auto& inventory = DataManager::getInstance().getModule("inventory");
        json::array_t inv_arr;
        if (inventory.is_object()) {
            for (auto& [key, value] : inventory.items()) {
                json item;
                if (value.is_number()) {
                    item["id"] = key;
                    item["name"] = key;
                    item["quantity"] = value.get<int>();
                    item["icon"] = "📦";
                } else if (value.is_object()) {
                    item = value;
                    if (!item.contains("id")) {
                        item["id"] = key;
                    }
                    if (!item.contains("quantity")) {
                        item["quantity"] = 1;
                    }
                }
                inv_arr.push_back(item);
            }
        }
        result["inventory"] = inv_arr;
        
        // 转换equipment为物品对象格式
        auto& equipmentRef = DataManager::getInstance().getModule("equipment");
        auto& itemLibrary = DataManager::getInstance().getModule("item_library");
        json equipmentObj = json::object();
        if (equipmentRef.is_object()) {
            for (auto& [slot, itemIdVal] : equipmentRef.items()) {
                json itemInfo;
                bool found = false;
                
                if (itemIdVal.is_object()) {
                    // 已经是完整物品对象，直接使用
                    itemInfo = itemIdVal;
                    found = true;
                } else if (itemIdVal.is_string()) {
                    // 字符串ID，需要从背包或物品库查找
                    std::string eItemId = itemIdVal.get<std::string>();
                    
                    if (!eItemId.empty()) {
                        // 从背包中查找
                        if (inventory.contains(eItemId) && inventory[eItemId].is_object()) {
                            itemInfo = inventory[eItemId];
                            itemInfo["id"] = eItemId;
                            found = true;
                        }
                        
                        // 从物品库中查找
                        if (!found && itemLibrary.is_array()) {
                            for (auto& libItem : itemLibrary) {
                                if (libItem.value("id", "") == eItemId) {
                                    itemInfo = libItem;
                                    found = true;
                                    break;
                                }
                            }
                        }
                        
                        if (!found) {
                            itemInfo["id"] = eItemId;
                            itemInfo["name"] = eItemId;
                            itemInfo["icon"] = "📦";
                        }
                    }
                }
                
                if (found || !itemInfo.empty()) {
                    equipmentObj[slot] = itemInfo;
                } else {
                    equipmentObj[slot] = itemIdVal;
                }
            }
        }
        result["equipment"] = equipmentObj;
        result["equipment_slots"] = DataManager::getInstance().getModule("equipment_slots");
        result["currency"] = DataManager::getInstance().getModule("currency");
        result["currency_types"] = DataManager::getInstance().getModule("currency_types");
        result["stats"] = DataManager::getInstance().getModule("stats");
        return jsonResponse(result);
    });
    
    // 保存所有数据
    CROW_ROUTE(app, "/api/save").methods("POST"_method)([](const crow::request& req){
        bool success = DataManager::getInstance().saveAll();
        if (success) {
            return successMessage("数据保存成功");
        } else {
            return errorResponse("数据保存失败");
        }
    });
    
    // ==================== 角色模块 ====================
    
    CROW_ROUTE(app, "/api/character")([](){
        return jsonResponse(DataManager::getInstance().getModule("character"));
    });
    
    CROW_ROUTE(app, "/api/character/save").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        DataManager::getInstance().getModule("character") = body;
        DataManager::getInstance().saveModule("character");
        
        json result;
        result["success"] = true;
        result["message"] = "角色保存成功";
        result["character"] = DataManager::getInstance().getModule("character");
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/character/edit").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        auto& character = DataManager::getInstance().getModule("character");
        for (auto& [key, value] : body.items()) {
            character[key] = value;
        }
        DataManager::getInstance().saveModule("character");
        
        json result;
        result["success"] = true;
        result["message"] = "角色保存成功";
        result["character"] = character;
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/character/rename").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string newName = body.value("name", "");
        auto& character = DataManager::getInstance().getModule("character");
        character["name"] = newName;
        DataManager::getInstance().saveModule("character");
        
        json result;
        result["success"] = true;
        result["character"] = character;
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/character/templates")([](){
        return jsonResponse(DataManager::getInstance().getModule("character_templates"));
    });
    
    CROW_ROUTE(app, "/api/character/templates/create").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("id", "");
        auto& templates = DataManager::getInstance().getModule("character_templates");
        templates[id] = body;
        DataManager::getInstance().saveModule("character_templates");
        
        json result;
        result["success"] = true;
        result["templates"] = templates;
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/character/templates/edit").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("id", "");
        auto& templates = DataManager::getInstance().getModule("character_templates");
        if (templates.contains(id)) {
            templates[id] = body;
            DataManager::getInstance().saveModule("character_templates");
            
            json result;
            result["success"] = true;
            result["templates"] = templates;
            return jsonResponse(result);
        }
        return errorResponse("模板不存在");
    });
    
    CROW_ROUTE(app, "/api/character/templates/delete").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("id", "");
        auto& templates = DataManager::getInstance().getModule("character_templates");
        if (templates.contains(id)) {
            templates.erase(id);
            DataManager::getInstance().saveModule("character_templates");
            
            json result;
            result["success"] = true;
            result["templates"] = templates;
            return jsonResponse(result);
        }
        return errorResponse("模板不存在");
    });
    
    // ==================== 货币模块 ====================
    
    CROW_ROUTE(app, "/api/currency")([](){
        return jsonResponse(DataManager::getInstance().getModule("currency"));
    });
    
    CROW_ROUTE(app, "/api/currency/add").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string type = body.value("type", "");
        long long amount = body.contains("amount") && body["amount"].is_number() ? body["amount"].get<long long>() : 0;
        auto& currency = DataManager::getInstance().getModule("currency");
        if (!currency.contains(type)) {
            currency[type] = 0;
        }
        long long current = currency[type].is_number() ? currency[type].get<long long>() : 0;
        currency[type] = current + amount;
        DataManager::getInstance().saveModule("currency");
        json result;
        result["success"] = true;
        result["currency"] = currency;
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/currency/set").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string type = body.value("type", "");
        long long amount = body.contains("amount") && body["amount"].is_number() ? body["amount"].get<long long>() : 0;
        auto& currency = DataManager::getInstance().getModule("currency");
        currency[type] = amount;
        DataManager::getInstance().saveModule("currency");
        json result;
        result["success"] = true;
        result["currency"] = currency;
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/currency/delete").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string type = body.value("type", "");
        auto& currency = DataManager::getInstance().getModule("currency");
        if (currency.contains(type)) {
            currency.erase(type);
            DataManager::getInstance().saveModule("currency");
            json result;
            result["success"] = true;
            result["currency"] = currency;
            return jsonResponse(result);
        }
        return errorResponse("货币类型不存在");
    });
    
    CROW_ROUTE(app, "/api/currency/types")([](){
        return jsonResponse(DataManager::getInstance().getModule("currency_types"));
    });
    
    CROW_ROUTE(app, "/api/currency/types/add").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("currency_id", body.value("id", ""));
        std::string name = body.value("name", "");
        std::string icon = body.value("icon", "🪙");
        long long initial_amount = body.contains("initial_amount") && body["initial_amount"].is_number() ? body["initial_amount"].get<long long>() : 0;
        
        if (id.empty()) {
            return errorResponse("货币ID不能为空");
        }
        
        auto& types = DataManager::getInstance().getModule("currency_types");
        json type_info;
        type_info["name"] = name;
        type_info["icon"] = icon;
        type_info["currency_id"] = id;
        types[id] = type_info;
        DataManager::getInstance().saveModule("currency_types");
        
        // 同时添加初始数量（即使为0也添加，确保能显示）
        auto& currency = DataManager::getInstance().getModule("currency");
        currency[id] = initial_amount;
        DataManager::getInstance().saveModule("currency");
        
        json result;
        result["success"] = true;
        result["message"] = "货币类型添加成功";
        result["currency_types"] = types;
        result["currency"] = DataManager::getInstance().getModule("currency");
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/currency/types/edit").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("currency_id", body.value("id", ""));
        auto& types = DataManager::getInstance().getModule("currency_types");
        if (types.contains(id)) {
            // 保留原有数据，只更新传入的字段
            if (body.contains("name")) {
                types[id]["name"] = body["name"];
            }
            if (body.contains("icon")) {
                types[id]["icon"] = body["icon"];
            }
            DataManager::getInstance().saveModule("currency_types");
            
            json result;
            result["success"] = true;
            result["message"] = "货币类型更新成功";
            result["currency_types"] = types;
            return jsonResponse(result);
        }
        return errorResponse("货币类型不存在");
    });
    
    CROW_ROUTE(app, "/api/currency/types/delete").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("currency_id", body.value("id", ""));
        auto& types = DataManager::getInstance().getModule("currency_types");
        if (types.contains(id)) {
            types.erase(id);
            DataManager::getInstance().saveModule("currency_types");
            
            // 同时删除对应的货币数量
            auto& currency = DataManager::getInstance().getModule("currency");
            if (currency.contains(id)) {
                currency.erase(id);
                DataManager::getInstance().saveModule("currency");
            }
            
            json result;
            result["success"] = true;
            result["message"] = "货币类型删除成功";
            result["currency_types"] = types;
            result["currency"] = currency;
            return jsonResponse(result);
        }
        return errorResponse("货币类型不存在");
    });
    
    // ==================== 背包模块 ====================
    
    CROW_ROUTE(app, "/api/inventory")([](){
        auto& inventory = DataManager::getInstance().getModule("inventory");
        // 转换为数组格式
        json::array_t arr;
        if (inventory.is_object()) {
            for (auto& [key, value] : inventory.items()) {
                json item;
                if (value.is_number()) {
                    // 简单格式：只有数量
                    item["id"] = key;
                    item["name"] = key;
                    item["quantity"] = value.get<int>();
                    item["icon"] = "📦";
                } else if (value.is_object()) {
                    // 完整格式：物品对象
                    item = value;
                    if (!item.contains("id")) {
                        item["id"] = key;
                    }
                    if (!item.contains("quantity")) {
                        item["quantity"] = 1;
                    }
                }
                arr.push_back(item);
            }
        }
        return jsonResponse(arr);
    });
    
    CROW_ROUTE(app, "/api/inventory/add").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string itemId = body.value("item_id", "");
        int quantity = body.value("quantity", 1);
        auto& inventory = DataManager::getInstance().getModule("inventory");
        auto& itemLibrary = DataManager::getInstance().getModule("item_library");
        
        // 从物品库查找物品信息
        json itemData;
        bool found = false;
        if (itemLibrary.is_array()) {
            for (auto& item : itemLibrary) {
                if (item.value("id", "") == itemId) {
                    itemData = item;
                    found = true;
                    break;
                }
            }
        }
        
        if (found) {
            // 找到物品，保存完整信息
            if (inventory.contains(itemId) && inventory[itemId].is_object()) {
                // 物品已存在，合并数量
                int existingQty = inventory[itemId].value("quantity", 1);
                itemData["quantity"] = existingQty + quantity;
            } else {
                itemData["quantity"] = quantity;
            }
            // 如果物品有分类，从分类获取bind_module并加到物品上
            std::string catId = itemData.value("category_id", "");
            if (!catId.empty()) {
                auto& categories = DataManager::getInstance().getModule("item_categories");
                if (categories.contains(catId) && categories[catId].is_object()) {
                    if (categories[catId].contains("bind_module") && categories[catId]["bind_module"].is_string()) {
                        itemData["bind_module"] = categories[catId]["bind_module"].get<std::string>();
                    }
                }
            }
            inventory[itemId] = itemData;
        } else {
            // 没找到，只保存数量
            if (!inventory.contains(itemId)) {
                inventory[itemId] = 0;
            }
            inventory[itemId] = inventory[itemId].get<int>() + quantity;
        }
        
        DataManager::getInstance().saveModule("inventory");
        
        // 转换为数组格式返回
        json::array_t arr;
        if (inventory.is_object()) {
            for (auto& [key, value] : inventory.items()) {
                json item;
                if (value.is_number()) {
                    item["id"] = key;
                    item["name"] = key;
                    item["quantity"] = value.get<int>();
                    item["icon"] = "📦";
                } else if (value.is_object()) {
                    item = value;
                    if (!item.contains("id")) {
                        item["id"] = key;
                    }
                    if (!item.contains("quantity")) {
                        item["quantity"] = 1;
                    }
                }
                arr.push_back(item);
            }
        }
        
        json result;
        result["success"] = true;
        result["inventory"] = arr;
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/inventory/edit").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string itemId = body.value("item_id", "");
        int quantity = body.value("quantity", 0);
        auto& inventory = DataManager::getInstance().getModule("inventory");
        inventory[itemId] = quantity;
        DataManager::getInstance().saveModule("inventory");
        
        // 转换为数组格式返回
        json::array_t arr;
        if (inventory.is_object()) {
            for (auto& [key, value] : inventory.items()) {
                json item;
                if (value.is_number()) {
                    item["id"] = key;
                    item["name"] = key;
                    item["quantity"] = value.get<int>();
                    item["icon"] = "📦";
                } else if (value.is_object()) {
                    item = value;
                    if (!item.contains("id")) {
                        item["id"] = key;
                    }
                    if (!item.contains("quantity")) {
                        item["quantity"] = 1;
                    }
                }
                arr.push_back(item);
            }
        }
        
        json result;
        result["success"] = true;
        result["inventory"] = arr;
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/inventory/remove").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string itemId = body.value("item_id", "");
        auto& inventory = DataManager::getInstance().getModule("inventory");
        if (inventory.contains(itemId)) {
            inventory.erase(itemId);
            DataManager::getInstance().saveModule("inventory");
            
            // 转换为数组格式返回
            json::array_t arr;
            if (inventory.is_object()) {
                for (auto& [key, value] : inventory.items()) {
                    json item;
                    if (value.is_number()) {
                        item["id"] = key;
                        item["name"] = key;
                        item["quantity"] = value.get<int>();
                        item["icon"] = "📦";
                    } else if (value.is_object()) {
                        item = value;
                        if (!item.contains("id")) {
                            item["id"] = key;
                        }
                        if (!item.contains("quantity")) {
                            item["quantity"] = 1;
                        }
                    }
                    arr.push_back(item);
                }
            }
            
            json result;
            result["success"] = true;
            result["inventory"] = arr;
            return jsonResponse(result);
        }
        return errorResponse("物品不存在");
    });
    
    CROW_ROUTE(app, "/api/inventory/add-custom").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string itemId = body.value("id", "");
        
        // 如果没有提供ID，生成唯一ID
        if (itemId.empty()) {
            auto now = std::chrono::system_clock::now();
            auto timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()).count();
            itemId = "item_" + std::to_string(timestamp);
        }
        
        auto& inventory = DataManager::getInstance().getModule("inventory");
        
        // 确保物品有id字段
        json item_data = body;
        item_data["id"] = itemId;
        
        // 如果物品已存在，合并数量
        if (inventory.contains(itemId) && inventory[itemId].is_object()) {
            int existing_qty = inventory[itemId].value("quantity", 1);
            int new_qty = body.value("quantity", 1);
            item_data["quantity"] = existing_qty + new_qty;
        }
        
        inventory[itemId] = item_data;
        DataManager::getInstance().saveModule("inventory");
        
        // 转换为数组格式返回
        json::array_t arr;
        if (inventory.is_object()) {
            for (auto& [key, value] : inventory.items()) {
                json item;
                if (value.is_number()) {
                    item["id"] = key;
                    item["name"] = key;
                    item["quantity"] = value.get<int>();
                    item["icon"] = "📦";
                } else if (value.is_object()) {
                    item = value;
                    if (!item.contains("id")) {
                        item["id"] = key;
                    }
                    if (!item.contains("quantity")) {
                        item["quantity"] = 1;
                    }
                }
                arr.push_back(item);
            }
        }
        
        json result;
        result["success"] = true;
        result["inventory"] = arr;
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/items/library")([](){
        auto& itemLib = DataManager::getInstance().getModule("item_library");
        // 确保是数组格式
        if (itemLib.is_array()) {
            return jsonResponse(itemLib);
        } else {
            // 转换为数组
            json::array_t arr;
            if (itemLib.is_object()) {
                for (auto& [key, value] : itemLib.items()) {
                    json item = value;
                    if (!item.contains("id")) {
                        item["id"] = key;
                    }
                    arr.push_back(item);
                }
            }
            return jsonResponse(arr);
        }
    });
    
    CROW_ROUTE(app, "/api/items/library/add").methods("POST"_method)([](const crow::request& req){
        try {
            auto body = parseBody(req);
            std::string id = body.value("id", "");
            std::string name = body.value("name", "");
            
            if (name.empty()) {
                json result;
                result["success"] = false;
                result["error"] = "物品名称不能为空";
                return jsonResponse(result);
            }
            
            if (id.empty()) {
                // 固定ID格式：{分类前缀}_{序号}
                std::string categoryId = body.value("category_id", "");
                std::string prefix = categoryId.empty() ? "item" : categoryId;
                
                // 统计该分类下的物品数量，生成下一个序号
                auto& itemLib = DataManager::getInstance().getModule("item_library");
                int count = 0;
                if (itemLib.is_array()) {
                    for (auto& item : itemLib) {
                        std::string catId = item.value("category_id", "");
                        if (catId == categoryId) {
                            count++;
                        }
                    }
                } else if (itemLib.is_object()) {
                    for (auto& [key, value] : itemLib.items()) {
                        std::string catId = value.value("category_id", "");
                        if (catId == categoryId) {
                            count++;
                        }
                    }
                }
                
                // 生成3位序号，从001开始
                char seq[20];
                snprintf(seq, sizeof(seq), "%03d", count + 1);
                id = prefix + "_" + std::string(seq);
                
                // 检查ID是否已存在
                bool idExists = false;
                if (itemLib.is_object()) {
                    idExists = itemLib.contains(id);
                } else if (itemLib.is_array()) {
                    for (auto& item : itemLib) {
                        if (item.value("id", "") == id) {
                            idExists = true;
                            break;
                        }
                    }
                }
                
                // 如果ID已存在，追加时间戳后缀
                if (idExists) {
                    auto now = std::chrono::system_clock::now();
                    auto timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()).count();
                    id = id + "_" + std::to_string(timestamp);
                }
            }
            
            body["id"] = id;
            
            auto& itemLib = DataManager::getInstance().getModule("item_library");
            
            // 添加到物品库（支持数组和对象两种格式）
            if (itemLib.is_array()) {
                itemLib.push_back(body);
            } else {
                itemLib[id] = body;
            }
            
            if (!DataManager::getInstance().saveModule("item_library")) {
                json result;
                result["success"] = false;
                result["error"] = "保存数据失败";
                return jsonResponse(result);
            }
            
            // 返回数组格式
            json::array_t arr;
            if (itemLib.is_array()) {
                arr = itemLib.get<json::array_t>();
            } else if (itemLib.is_object()) {
                for (auto& [key, value] : itemLib.items()) {
                    json item = value;
                    if (!item.contains("id")) {
                        item["id"] = key;
                    }
                    arr.push_back(item);
                }
            }
            
            json result;
            result["success"] = true;
            result["items"] = arr;
            return jsonResponse(result);
        } catch (const std::exception& e) {
            json result;
            result["success"] = false;
            result["error"] = std::string("服务器错误: ") + e.what();
            return jsonResponse(result);
        }
    });
    
    CROW_ROUTE(app, "/api/items/custom/create").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("id", "");
        auto& customItems = DataManager::getInstance().getModule("custom_items_def");
        customItems[id] = body;
        DataManager::getInstance().saveModule("custom_items_def");
        
        json result;
        result["success"] = true;
        result["items"] = customItems;
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/items/custom/edit").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("id", "");
        auto& customItems = DataManager::getInstance().getModule("custom_items_def");
        if (customItems.contains(id)) {
            customItems[id] = body;
            DataManager::getInstance().saveModule("custom_items_def");
            
            json result;
            result["success"] = true;
            result["items"] = customItems;
            return jsonResponse(result);
        }
        return errorResponse("自定义物品类型不存在");
    });
    
    CROW_ROUTE(app, "/api/items/custom/delete").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("id", "");
        auto& customItems = DataManager::getInstance().getModule("custom_items_def");
        if (customItems.contains(id)) {
            customItems.erase(id);
            DataManager::getInstance().saveModule("custom_items_def");
            
            json result;
            result["success"] = true;
            result["items"] = customItems;
            return jsonResponse(result);
        }
        return errorResponse("自定义物品类型不存在");
    });
    
    // ==================== 装备模块 ====================
    
    CROW_ROUTE(app, "/api/equipment")([](){
        auto& equipmentRef = DataManager::getInstance().getModule("equipment");
        auto& inventory = DataManager::getInstance().getModule("inventory");
        auto& itemLibrary = DataManager::getInstance().getModule("item_library");
        
        // 转换为物品对象格式
        json equipmentObj = json::object();
        if (equipmentRef.is_object()) {
            for (auto& [slot, itemIdVal] : equipmentRef.items()) {
                json itemInfo;
                bool found = false;
                
                if (itemIdVal.is_object()) {
                    // 已经是完整物品对象，直接使用
                    itemInfo = itemIdVal;
                    found = true;
                } else if (itemIdVal.is_string()) {
                    // 字符串ID，需要从背包或物品库查找
                    std::string eItemId = itemIdVal.get<std::string>();
                    
                    if (!eItemId.empty()) {
                        // 从背包中查找
                        if (inventory.contains(eItemId) && inventory[eItemId].is_object()) {
                            itemInfo = inventory[eItemId];
                            itemInfo["id"] = eItemId;
                            found = true;
                        }
                        
                        // 从物品库中查找
                        if (!found && itemLibrary.is_array()) {
                            for (auto& libItem : itemLibrary) {
                                if (libItem.value("id", "") == eItemId) {
                                    itemInfo = libItem;
                                    found = true;
                                    break;
                                }
                            }
                        }
                        
                        if (!found) {
                            itemInfo["id"] = eItemId;
                            itemInfo["name"] = eItemId;
                            itemInfo["icon"] = "📦";
                        }
                    }
                }
                
                if (found || !itemInfo.is_null()) {
                    equipmentObj[slot] = itemInfo;
                } else {
                    equipmentObj[slot] = itemIdVal;
                }
            }
        }
        
        return jsonResponse(equipmentObj);
    });
    
    CROW_ROUTE(app, "/api/equipment/equip").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string slot = body.value("slot", "");
        std::string itemId = body.value("item_id", "");
        
        auto& equipment = DataManager::getInstance().getModule("equipment");
        auto& inventory = DataManager::getInstance().getModule("inventory");
        
        // 如果slot为空，尝试从物品信息中获取装备槽位
        if (slot.empty() && inventory.contains(itemId) && inventory[itemId].is_object()) {
            // 安全获取equip_slot，处理null值
            if (inventory[itemId].contains("equip_slot") && inventory[itemId]["equip_slot"].is_string()) {
                slot = inventory[itemId]["equip_slot"].get<std::string>();
            }
            // 如果还是空，根据类型推断
            if (slot.empty()) {
                std::string type = "";
                if (inventory[itemId].contains("type") && inventory[itemId]["type"].is_string()) {
                    type = inventory[itemId]["type"].get<std::string>();
                }
                if (type == "weapon") slot = "weapon";
                else if (type == "armor") slot = "armor";
                else if (type == "accessory") slot = "accessory";
            }
        }
        
        if (slot.empty()) {
            return errorResponse("无法确定装备槽位");
        }
        
        // 如果该槽位已有装备，先放回背包
        if (equipment.contains(slot)) {
            std::string oldItemId;
            bool isObject = false;
            
            if (equipment[slot].is_string()) {
                oldItemId = equipment[slot].get<std::string>();
            } else if (equipment[slot].is_object() && equipment[slot].contains("id")) {
                oldItemId = equipment[slot]["id"].get<std::string>();
                isObject = true;
            }
            
            if (!oldItemId.empty()) {
                // 放回背包
                if (inventory.contains(oldItemId) && inventory[oldItemId].is_object()) {
                    int qty = 1;
                    if (inventory[oldItemId].contains("quantity") && inventory[oldItemId]["quantity"].is_number()) {
                        qty = inventory[oldItemId]["quantity"].get<int>();
                    }
                    inventory[oldItemId]["quantity"] = qty + 1;
                } else if (isObject) {
                    // 装备是完整对象，直接复制到背包
                    json oldItem = equipment[slot];
                    oldItem["quantity"] = 1;
                    inventory[oldItemId] = oldItem;
                } else {
                    // 只有ID，创建基础对象
                    json oldItem;
                    oldItem["id"] = oldItemId;
                    oldItem["name"] = oldItemId;
                    oldItem["quantity"] = 1;
                    oldItem["icon"] = "📦";
                    inventory[oldItemId] = oldItem;
                }
            }
        }
        
        // 装备新物品（保存完整物品对象）
        if (inventory.contains(itemId) && inventory[itemId].is_object()) {
            json itemCopy = inventory[itemId];
            // 确保有id字段
            if (!itemCopy.contains("id")) {
                itemCopy["id"] = itemId;
            }
            equipment[slot] = itemCopy;
        } else {
            // 简单格式，创建基础对象
            json itemObj;
            itemObj["id"] = itemId;
            itemObj["name"] = itemId;
            itemObj["icon"] = "📦";
            equipment[slot] = itemObj;
        }
        
        // 从背包移除（数量减1，如果为0则删除）
        // 支持对象格式和数字格式
        if (inventory.contains(itemId)) {
            if (inventory[itemId].is_object()) {
                int qty = 1;
                if (inventory[itemId].contains("quantity") && inventory[itemId]["quantity"].is_number()) {
                    qty = inventory[itemId]["quantity"].get<int>();
                }
                if (qty <= 1) {
                    inventory.erase(itemId);
                } else {
                    inventory[itemId]["quantity"] = qty - 1;
                }
            } else if (inventory[itemId].is_number()) {
                int qty = inventory[itemId].get<int>();
                if (qty <= 1) {
                    inventory.erase(itemId);
                } else {
                    inventory[itemId] = qty - 1;
                }
            }
        }
        
        DataManager::getInstance().saveModule("equipment");
        DataManager::getInstance().saveModule("inventory");
        
        // 转换inventory为数组格式
        json::array_t inv_arr;
        if (inventory.is_object()) {
            for (auto& [key, value] : inventory.items()) {
                json item;
                if (value.is_number()) {
                    item["id"] = key;
                    item["name"] = key;
                    item["quantity"] = value.get<int>();
                    item["icon"] = "📦";
                } else if (value.is_object()) {
                    item = value;
                    if (!item.contains("id")) {
                        item["id"] = key;
                    }
                    if (!item.contains("quantity")) {
                        item["quantity"] = 1;
                    }
                }
                inv_arr.push_back(item);
            }
        }
        
        // 转换equipment为物品对象格式（从字符串ID转为完整物品对象）
        json equipmentObj;
        auto& itemLibrary = DataManager::getInstance().getModule("item_library");
        if (equipment.is_object()) {
            for (auto& [slot, itemIdVal] : equipment.items()) {
                json itemInfo;
                bool found = false;
                
                if (itemIdVal.is_object()) {
                    // 已经是完整物品对象，直接使用
                    itemInfo = itemIdVal;
                    found = true;
                } else if (itemIdVal.is_string()) {
                    // 字符串ID，需要从背包或物品库查找
                    std::string eItemId = itemIdVal.get<std::string>();
                    
                    if (!eItemId.empty()) {
                        // 先从背包中查找物品信息
                        if (inventory.contains(eItemId) && inventory[eItemId].is_object()) {
                            itemInfo = inventory[eItemId];
                            itemInfo["id"] = eItemId;
                            found = true;
                        }
                        
                        // 如果背包中没有，从物品库中查找
                        if (!found && itemLibrary.is_array()) {
                            for (auto& libItem : itemLibrary) {
                                if (libItem.value("id", "") == eItemId) {
                                    itemInfo = libItem;
                                    found = true;
                                    break;
                                }
                            }
                        }
                        
                        // 如果都没找到，用ID作为名称
                        if (!found) {
                            itemInfo["id"] = eItemId;
                            itemInfo["name"] = eItemId;
                            itemInfo["icon"] = "📦";
                        }
                    }
                }
                
                if (found || !itemInfo.empty()) {
                    equipmentObj[slot] = itemInfo;
                } else {
                    equipmentObj[slot] = itemIdVal;
                }
            }
        }
        
        json result;
        result["success"] = true;
        result["equipment"] = equipmentObj;
        result["inventory"] = inv_arr;
        result["character"] = DataManager::getInstance().getModule("character");
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/equipment/unequip").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string slot = body.value("slot", "");
        auto& equipment = DataManager::getInstance().getModule("equipment");
        auto& inventory = DataManager::getInstance().getModule("inventory");
        
        // 检查装备槽是否存在（用遍历方式，更兼容）
        bool slotExists = false;
        if (equipment.is_object()) {
            for (auto& [key, value] : equipment.items()) {
                if (key == slot) {
                    slotExists = true;
                    break;
                }
            }
        }
        
        if (slotExists) {
            std::string itemId;
            if (equipment[slot].is_string()) {
                itemId = equipment[slot].get<std::string>();
            } else if (equipment[slot].is_object() && equipment[slot].contains("id")) {
                itemId = equipment[slot]["id"].get<std::string>();
            }
            
            if (!itemId.empty()) {
                // 放回背包（支持对象格式和数字格式）
                if (inventory.contains(itemId)) {
                    if (inventory[itemId].is_object()) {
                        int qty = 1;
                        if (inventory[itemId].contains("quantity") && inventory[itemId]["quantity"].is_number()) {
                            qty = inventory[itemId]["quantity"].get<int>();
                        }
                        inventory[itemId]["quantity"] = qty + 1;
                    } else if (inventory[itemId].is_number()) {
                        int qty = inventory[itemId].get<int>();
                        inventory[itemId] = qty + 1;
                    }
                } else {
                    // 如果装备数据是完整对象，直接复制到背包
                    if (equipment[slot].is_object()) {
                        json itemCopy = equipment[slot];
                        // 确保quantity为1
                        itemCopy["quantity"] = 1;
                        inventory[itemId] = itemCopy;
                    } else {
                        // 简单格式，创建基础对象
                        json item;
                        item["id"] = itemId;
                        item["name"] = itemId;
                        item["quantity"] = 1;
                        item["icon"] = "📦";
                        inventory[itemId] = item;
                    }
                }
            }
            
            equipment.erase(slot);
            DataManager::getInstance().saveModule("equipment");
            DataManager::getInstance().saveModule("inventory");
            
            // 转换inventory为数组格式
            json::array_t inv_arr;
            if (inventory.is_object()) {
                for (auto& [key, value] : inventory.items()) {
                    json item;
                    if (value.is_number()) {
                        item["id"] = key;
                        item["name"] = key;
                        item["quantity"] = value.get<int>();
                        item["icon"] = "📦";
                    } else if (value.is_object()) {
                        item = value;
                        if (!item.contains("id")) {
                            item["id"] = key;
                        }
                        if (!item.contains("quantity")) {
                            item["quantity"] = 1;
                        }
                    }
                    inv_arr.push_back(item);
                }
            }
            
            json result;
            result["success"] = true;
            result["equipment"] = equipment;
            result["inventory"] = inv_arr;
            result["character"] = DataManager::getInstance().getModule("character");
            return jsonResponse(result);
        }
        return errorResponse("装备槽不存在");
    });
    
    CROW_ROUTE(app, "/api/equipment/slots")([](){
        return jsonResponse(DataManager::getInstance().getModule("equipment_slots"));
    });
    
    CROW_ROUTE(app, "/api/equipment/slots/add").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("slot_id", body.value("id", ""));
        std::string name = body.value("name", "");
        std::string icon = body.value("icon", "⚔️");
        
        if (id.empty()) {
            return errorResponse("槽位ID不能为空");
        }
        
        auto& slots = DataManager::getInstance().getModule("equipment_slots");
        json slot_info;
        slot_info["name"] = name.empty() ? id : name;
        slot_info["icon"] = icon;
        slot_info["slot_id"] = id;
        slots[id] = slot_info;
        DataManager::getInstance().saveModule("equipment_slots");
        
        json result;
        result["success"] = true;
        result["slots"] = slots;
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/equipment/slots/edit").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("slot_id", body.value("id", ""));
        auto& slots = DataManager::getInstance().getModule("equipment_slots");
        if (slots.contains(id)) {
            // 保留原有数据，只更新传入的字段
            if (body.contains("name")) {
                slots[id]["name"] = body["name"];
            }
            if (body.contains("icon")) {
                slots[id]["icon"] = body["icon"];
            }
            DataManager::getInstance().saveModule("equipment_slots");
            
            json result;
            result["success"] = true;
            result["slots"] = slots;
            return jsonResponse(result);
        }
        return errorResponse("装备槽位不存在");
    });
    
    CROW_ROUTE(app, "/api/equipment/slots/delete").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("slot_id", body.value("id", ""));
        auto& slots = DataManager::getInstance().getModule("equipment_slots");
        if (slots.contains(id)) {
            slots.erase(id);
            DataManager::getInstance().saveModule("equipment_slots");
            
            // 同时删除该槽位的装备
            auto& equipment = DataManager::getInstance().getModule("equipment");
            if (equipment.contains(id)) {
                equipment.erase(id);
                DataManager::getInstance().saveModule("equipment");
            }
            
            json result;
            result["success"] = true;
            result["slots"] = slots;
            result["equipment"] = equipment;
            return jsonResponse(result);
        }
        return errorResponse("装备槽位不存在");
    });
    
    // ==================== 任务模块 ====================
    
    CROW_ROUTE(app, "/api/quests")([](){
        return jsonResponse(DataManager::getInstance().getModule("quests"));
    });
    
    CROW_ROUTE(app, "/api/quests/accept").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string questId = body.value("quest_id", "");
        auto& quests = DataManager::getInstance().getModule("quests");
        quests[questId] = {{"status", "in_progress"}, {"progress", 0}};
        DataManager::getInstance().saveModule("quests");
        
        json result;
        result["success"] = true;
        result["quests"] = quests;
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/quests/progress").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string questId = body.value("quest_id", "");
        int progress = body.value("progress", 0);
        auto& quests = DataManager::getInstance().getModule("quests");
        if (quests.contains(questId)) {
            quests[questId]["progress"] = progress;
            DataManager::getInstance().saveModule("quests");
            
            json result;
            result["success"] = true;
            result["quests"] = quests;
            return jsonResponse(result);
        }
        return errorResponse("任务不存在");
    });
    
    CROW_ROUTE(app, "/api/quests/complete").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string questId = body.value("quest_id", "");
        auto& quests = DataManager::getInstance().getModule("quests");
        if (quests.contains(questId)) {
            quests[questId]["status"] = "completed";
            DataManager::getInstance().saveModule("quests");
            
            json result;
            result["success"] = true;
            result["quests"] = quests;
            return jsonResponse(result);
        }
        return errorResponse("任务不存在");
    });
    
    CROW_ROUTE(app, "/api/quests/custom/list")([](){
        auto& data = DataManager::getInstance().getModule("quests_custom");
        // 转换为数组格式
        json::array_t quests_arr;
        if (data.is_object()) {
            for (auto& [key, value] : data.items()) {
                json quest = value;
                if (!quest.contains("id")) {
                    quest["id"] = key;
                }
                quests_arr.push_back(quest);
            }
        }
        json result;
        result["quests"] = quests_arr;
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/quests/custom/create").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("id", "");
        if (id.empty()) {
            // 生成ID
            auto now = std::chrono::system_clock::now();
            auto timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()).count();
            id = "quest_" + std::to_string(timestamp);
            body["id"] = id;
        }
        auto& customQuests = DataManager::getInstance().getModule("quests_custom");
        customQuests[id] = body;
        DataManager::getInstance().saveModule("quests_custom");
        
        // 转换为数组格式返回
        json::array_t quests_arr;
        if (customQuests.is_object()) {
            for (auto& [key, value] : customQuests.items()) {
                json quest = value;
                if (!quest.contains("id")) {
                    quest["id"] = key;
                }
                quests_arr.push_back(quest);
            }
        }
        
        json result;
        result["success"] = true;
        result["quests"] = quests_arr;
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/quests/custom/edit").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("id", "");
        auto& customQuests = DataManager::getInstance().getModule("quests_custom");
        if (customQuests.contains(id)) {
            // 保留原有id
            body["id"] = id;
            customQuests[id] = body;
            DataManager::getInstance().saveModule("quests_custom");
            
            // 转换为数组格式返回
            json::array_t quests_arr;
            if (customQuests.is_object()) {
                for (auto& [key, value] : customQuests.items()) {
                    json quest = value;
                    if (!quest.contains("id")) {
                        quest["id"] = key;
                    }
                    quests_arr.push_back(quest);
                }
            }
            
            json result;
            result["success"] = true;
            result["quests"] = quests_arr;
            return jsonResponse(result);
        }
        return errorResponse("自定义任务不存在");
    });
    
    CROW_ROUTE(app, "/api/quests/custom/delete").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("id", "");
        auto& customQuests = DataManager::getInstance().getModule("quests_custom");
        if (customQuests.contains(id)) {
            customQuests.erase(id);
            DataManager::getInstance().saveModule("quests_custom");
            
            // 转换为数组格式返回
            json::array_t quests_arr;
            if (customQuests.is_object()) {
                for (auto& [key, value] : customQuests.items()) {
                    json quest = value;
                    if (!quest.contains("id")) {
                        quest["id"] = key;
                    }
                    quests_arr.push_back(quest);
                }
            }
            
            json result;
            result["success"] = true;
            result["quests"] = quests_arr;
            return jsonResponse(result);
        }
        return errorResponse("自定义任务不存在");
    });
    
    CROW_ROUTE(app, "/api/quests/templates")([](){
        return jsonResponse(DataManager::getInstance().getModule("quests_templates"));
    });
    
    // ==================== 技能模块 ====================
    
    CROW_ROUTE(app, "/api/skills")([](){
        return jsonResponse(DataManager::getInstance().getModule("skills"));
    });
    
    CROW_ROUTE(app, "/api/skills/learn").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string skillId = body.value("skill_id", "");
        int level = body.value("level", 1);
        auto& skills = DataManager::getInstance().getModule("skills");
        skills[skillId] = {{"level", level}, {"learned", true}};
        DataManager::getInstance().saveModule("skills");
        
        json result;
        result["success"] = true;
        result["skills"] = skills;
        return jsonResponse(result);
    });

    // 从背包物品学习技能（可靠版本）
    CROW_ROUTE(app, "/api/skills/learn-item").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string itemId = body.value("item_id", "");
        
        if (itemId.empty()) {
            return errorResponse("物品ID不能为空");
        }
        
        auto& skills = DataManager::getInstance().getModule("skills");
        auto& inventory = DataManager::getInstance().getModule("inventory");
        
        // 检查背包里有没有这个物品
        if (!inventory.contains(itemId)) {
            return errorResponse("背包中没有该物品");
        }
        
        // 获取物品信息
        json item;
        if (inventory[itemId].is_object()) {
            item = inventory[itemId];
        } else {
            // 只有数量，创建基础对象
            item["id"] = itemId;
            item["name"] = itemId;
            item["icon"] = "✨";
        }
        
        // 确保有id字段
        if (!item.contains("id")) {
            item["id"] = itemId;
        }
        
        // 添加到技能列表（完整信息）
        json skillData = item;
        skillData["learned"] = true;
        if (!skillData.contains("level")) {
            skillData["level"] = 1;
        }
        // 移除quantity字段（技能不需要数量）
        if (skillData.contains("quantity")) {
            skillData.erase("quantity");
        }
        
        std::string skillId = itemId;
        skills[skillId] = skillData;
        
        // 消耗背包物品（数量-1）
        int quantity = 1;
        if (inventory[itemId].is_object() && inventory[itemId].contains("quantity")) {
            quantity = inventory[itemId]["quantity"].get<int>();
        } else if (inventory[itemId].is_number()) {
            quantity = inventory[itemId].get<int>();
        }
        
        quantity--;
        if (quantity <= 0) {
            inventory.erase(itemId);
        } else {
            if (inventory[itemId].is_object()) {
                inventory[itemId]["quantity"] = quantity;
            } else {
                inventory[itemId] = quantity;
            }
        }
        
        DataManager::getInstance().saveModule("skills");
        DataManager::getInstance().saveModule("inventory");
        
        json result;
        result["success"] = true;
        result["message"] = "技能学习成功";
        // 转换为数组格式（前端期望数组）
        json skillsArray = json::array();
        for (auto& [key, value] : skills.items()) {
            json skill = value;
            if (!skill.contains("id")) {
                skill["id"] = key;
            }
            skillsArray.push_back(skill);
        }
        result["skills"] = skillsArray;
        result["inventory"] = convertInventoryToArray(inventory);
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/skills/forget").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string skillId = body.value("skill_id", "");
        auto& skills = DataManager::getInstance().getModule("skills");
        if (skills.contains(skillId)) {
            skills.erase(skillId);
            DataManager::getInstance().saveModule("skills");
            
            json result;
            result["success"] = true;
            result["skills"] = skills;
            return jsonResponse(result);
        }
        return errorResponse("技能不存在");
    });
    
    CROW_ROUTE(app, "/api/skills/custom/list")([](){
        auto& data = DataManager::getInstance().getModule("skills_custom");
        // 转换为数组格式
        json::array_t skills_arr;
        if (data.is_object()) {
            for (auto& [key, value] : data.items()) {
                json skill = value;
                if (!skill.contains("id")) {
                    skill["id"] = key;
                }
                skills_arr.push_back(skill);
            }
        }
        json result;
        result["skills"] = skills_arr;
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/skills/custom/create").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("id", "");
        if (id.empty()) {
            // 生成ID
            auto now = std::chrono::system_clock::now();
            auto timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()).count();
            id = "skill_" + std::to_string(timestamp);
            body["id"] = id;
        }
        auto& customSkills = DataManager::getInstance().getModule("skills_custom");
        customSkills[id] = body;
        DataManager::getInstance().saveModule("skills_custom");
        
        // 转换为数组格式返回
        json::array_t skills_arr;
        if (customSkills.is_object()) {
            for (auto& [key, value] : customSkills.items()) {
                json skill = value;
                if (!skill.contains("id")) {
                    skill["id"] = key;
                }
                skills_arr.push_back(skill);
            }
        }
        
        json result;
        result["success"] = true;
        result["skills"] = skills_arr;
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/skills/custom/edit").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("id", "");
        auto& customSkills = DataManager::getInstance().getModule("skills_custom");
        if (customSkills.contains(id)) {
            // 保留原有id
            body["id"] = id;
            customSkills[id] = body;
            DataManager::getInstance().saveModule("skills_custom");
            
            // 转换为数组格式返回
            json::array_t skills_arr;
            if (customSkills.is_object()) {
                for (auto& [key, value] : customSkills.items()) {
                    json skill = value;
                    if (!skill.contains("id")) {
                        skill["id"] = key;
                    }
                    skills_arr.push_back(skill);
                }
            }
            
            json result;
            result["success"] = true;
            result["skills"] = skills_arr;
            return jsonResponse(result);
        }
        return errorResponse("自定义技能不存在");
    });
    
    CROW_ROUTE(app, "/api/skills/custom/delete").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("id", "");
        auto& customSkills = DataManager::getInstance().getModule("skills_custom");
        if (customSkills.contains(id)) {
            customSkills.erase(id);
            DataManager::getInstance().saveModule("skills_custom");
            
            // 转换为数组格式返回
            json::array_t skills_arr;
            if (customSkills.is_object()) {
                for (auto& [key, value] : customSkills.items()) {
                    json skill = value;
                    if (!skill.contains("id")) {
                        skill["id"] = key;
                    }
                    skills_arr.push_back(skill);
                }
            }
            
            json result;
            result["success"] = true;
            result["skills"] = skills_arr;
            return jsonResponse(result);
        }
        return errorResponse("自定义技能不存在");
    });
    
    CROW_ROUTE(app, "/api/skills/learn-custom").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string skillId = body.value("skill_id", "");
        int level = body.value("level", 1);
        auto& skills = DataManager::getInstance().getModule("skills");
        skills[skillId] = {{"level", level}, {"learned", true}, {"custom", true}};
        DataManager::getInstance().saveModule("skills");
        
        json result;
        result["success"] = true;
        result["skills"] = skills;
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/loot/open").methods("POST"_method)([](const crow::request& req){
        json result;
        result["items"] = json::array();
        result["currency"] = json::object();
        return successResponse(result);
    });
    
    // ==================== 剧情模块 ====================
    
    CROW_ROUTE(app, "/api/story/marks")([](){
        auto& story = DataManager::getInstance().getModule("story");
        json marks_obj = story.contains("marks") ? story["marks"] : json::object();
        // 转换为数组格式
        json::array_t marks_arr;
        if (marks_obj.is_object()) {
            for (auto& [key, value] : marks_obj.items()) {
                json mark = value;
                if (!mark.contains("id")) {
                    mark["id"] = key;
                }
                marks_arr.push_back(mark);
            }
        }
        return jsonResponse(marks_arr);
    });
    
    CROW_ROUTE(app, "/api/story/marks/add").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("mark_id", "");
        if (id.empty()) {
            return errorResponse("标记ID不能为空");
        }
        auto& story = DataManager::getInstance().getModule("story");
        if (!story.contains("marks")) {
            story["marks"] = json::object();
        }
        story["marks"][id] = body;
        DataManager::getInstance().saveModule("story");
        
        // 转换为数组格式返回
        json::array_t marks_arr;
        if (story["marks"].is_object()) {
            for (auto& [key, value] : story["marks"].items()) {
                json mark = value;
                if (!mark.contains("id")) {
                    mark["id"] = key;
                }
                marks_arr.push_back(mark);
            }
        }
        
        json result;
        result["success"] = true;
        result["marks"] = marks_arr;
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/story/marks/edit").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string old_id = body.value("old_id", "");
        std::string new_id = body.value("mark_id", "");
        if (old_id.empty() || new_id.empty()) {
            return errorResponse("标记ID不能为空");
        }
        auto& story = DataManager::getInstance().getModule("story");
        if (!story.contains("marks") || !story["marks"].contains(old_id)) {
            return errorResponse("剧情标记不存在");
        }
        
        // 如果ID变了，删除旧的
        if (old_id != new_id) {
            story["marks"].erase(old_id);
        }
        story["marks"][new_id] = body;
        DataManager::getInstance().saveModule("story");
        
        // 转换为数组格式返回
        json::array_t marks_arr;
        if (story["marks"].is_object()) {
            for (auto& [key, value] : story["marks"].items()) {
                json mark = value;
                if (!mark.contains("id")) {
                    mark["id"] = key;
                }
                marks_arr.push_back(mark);
            }
        }
        
        json result;
        result["success"] = true;
        result["marks"] = marks_arr;
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/story/marks/delete").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("mark_id", "");
        if (id.empty()) {
            return errorResponse("标记ID不能为空");
        }
        auto& story = DataManager::getInstance().getModule("story");
        if (story.contains("marks") && story["marks"].contains(id)) {
            story["marks"].erase(id);
            DataManager::getInstance().saveModule("story");
        }
        
        // 转换为数组格式返回
        json::array_t marks_arr;
        if (story.contains("marks") && story["marks"].is_object()) {
            for (auto& [key, value] : story["marks"].items()) {
                json mark = value;
                if (!mark.contains("id")) {
                    mark["id"] = key;
                }
                marks_arr.push_back(mark);
            }
        }
        
        json result;
        result["success"] = true;
        result["marks"] = marks_arr;
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/foreshadowing")([](){
        auto& story = DataManager::getInstance().getModule("story");
        json fs_obj = story.contains("foreshadowing") ? story["foreshadowing"] : json::object();
        // 转换为数组格式
        json::array_t fs_arr;
        if (fs_obj.is_object()) {
            for (auto& [key, value] : fs_obj.items()) {
                json fs = value;
                if (!fs.contains("id")) {
                    fs["id"] = key;
                }
                fs_arr.push_back(fs);
            }
        }
        return jsonResponse(fs_arr);
    });
    
    CROW_ROUTE(app, "/api/foreshadowing/add").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("foreshadow_id", "");
        if (id.empty()) {
            return errorResponse("伏笔ID不能为空");
        }
        auto& story = DataManager::getInstance().getModule("story");
        if (!story.contains("foreshadowing")) {
            story["foreshadowing"] = json::object();
        }
        story["foreshadowing"][id] = body;
        DataManager::getInstance().saveModule("story");
        
        // 转换为数组格式返回
        json::array_t fs_arr;
        if (story["foreshadowing"].is_object()) {
            for (auto& [key, value] : story["foreshadowing"].items()) {
                json fs = value;
                if (!fs.contains("id")) {
                    fs["id"] = key;
                }
                fs_arr.push_back(fs);
            }
        }
        
        json result;
        result["success"] = true;
        result["foreshadowing"] = fs_arr;
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/foreshadowing/edit").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("id", "");
        if (id.empty()) {
            return errorResponse("伏笔ID不能为空");
        }
        auto& story = DataManager::getInstance().getModule("story");
        if (!story.contains("foreshadowing") || !story["foreshadowing"].contains(id)) {
            return errorResponse("伏笔不存在");
        }
        story["foreshadowing"][id] = body;
        DataManager::getInstance().saveModule("story");
        
        // 转换为数组格式返回
        json::array_t fs_arr;
        if (story["foreshadowing"].is_object()) {
            for (auto& [key, value] : story["foreshadowing"].items()) {
                json fs = value;
                if (!fs.contains("id")) {
                    fs["id"] = key;
                }
                fs_arr.push_back(fs);
            }
        }
        
        json result;
        result["success"] = true;
        result["foreshadowing"] = fs_arr;
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/foreshadowing/delete").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("id", "");
        if (id.empty()) {
            return errorResponse("伏笔ID不能为空");
        }
        auto& story = DataManager::getInstance().getModule("story");
        if (story.contains("foreshadowing") && story["foreshadowing"].contains(id)) {
            story["foreshadowing"].erase(id);
            DataManager::getInstance().saveModule("story");
        }
        
        // 转换为数组格式返回
        json::array_t fs_arr;
        if (story.contains("foreshadowing") && story["foreshadowing"].is_object()) {
            for (auto& [key, value] : story["foreshadowing"].items()) {
                json fs = value;
                if (!fs.contains("id")) {
                    fs["id"] = key;
                }
                fs_arr.push_back(fs);
            }
        }
        
        json result;
        result["success"] = true;
        result["foreshadowing"] = fs_arr;
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/foreshadowing/resolve").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("id", "");
        auto& story = DataManager::getInstance().getModule("story");
        if (story.contains("foreshadowing") && story["foreshadowing"].contains(id)) {
            story["foreshadowing"][id]["resolved"] = true;
            DataManager::getInstance().saveModule("story");
            
            // 转换为数组格式返回
            json::array_t fs_arr;
            if (story["foreshadowing"].is_object()) {
                for (auto& [key, value] : story["foreshadowing"].items()) {
                    json fs = value;
                    if (!fs.contains("id")) {
                        fs["id"] = key;
                    }
                    fs_arr.push_back(fs);
                }
            }
            
            json result;
            result["success"] = true;
            result["foreshadowing"] = fs_arr;
            return jsonResponse(result);
        }
        return errorResponse("伏笔不存在");
    });
    
    // ==================== 地图模块 ====================
    
    CROW_ROUTE(app, "/api/locations")([](){
        return jsonResponse(DataManager::getInstance().getModule("locations"));
    });
    
    CROW_ROUTE(app, "/api/locations/create").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("location_id", "");
        if (id.empty()) {
            id = body.value("id", "");
        }
        if (id.empty()) {
            id = "loc_" + std::to_string(std::chrono::system_clock::now().time_since_epoch().count());
        }
        body["id"] = id;
        auto& locations = DataManager::getInstance().getModule("locations");
        locations[id] = body;
        DataManager::getInstance().saveModule("locations");
        
        json result;
        result["success"] = true;
        result["locations"] = locations;
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/locations/edit").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("location_id", "");
        if (id.empty()) {
            id = body.value("id", "");
        }
        auto& locations = DataManager::getInstance().getModule("locations");
        if (locations.contains(id)) {
            locations[id] = body;
            DataManager::getInstance().saveModule("locations");
            
            json result;
            result["success"] = true;
            result["locations"] = locations;
            return jsonResponse(result);
        }
        return errorResponse("地点不存在");
    });
    
    CROW_ROUTE(app, "/api/locations/delete").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("location_id", "");
        if (id.empty()) {
            id = body.value("id", "");
        }
        auto& locations = DataManager::getInstance().getModule("locations");
        if (locations.contains(id)) {
            locations.erase(id);
            DataManager::getInstance().saveModule("locations");
            
            json result;
            result["success"] = true;
            result["locations"] = locations;
            return jsonResponse(result);
        }
        return errorResponse("地点不存在");
    });
    
    CROW_ROUTE(app, "/api/locations/types")([](){
        return jsonResponse(DataManager::getInstance().getModule("location_types"));
    });
    
    CROW_ROUTE(app, "/api/locations/types/create").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("id", "");
        auto& types = DataManager::getInstance().getModule("location_types");
        types[id] = body;
        DataManager::getInstance().saveModule("location_types");
        
        json result;
        result["success"] = true;
        result["types"] = types;
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/locations/types/edit").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("id", "");
        auto& types = DataManager::getInstance().getModule("location_types");
        if (types.contains(id)) {
            types[id] = body;
            DataManager::getInstance().saveModule("location_types");
            
            json result;
            result["success"] = true;
            result["types"] = types;
            return jsonResponse(result);
        }
        return errorResponse("地点类型不存在");
    });
    
    CROW_ROUTE(app, "/api/locations/types/delete").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("id", "");
        auto& types = DataManager::getInstance().getModule("location_types");
        if (types.contains(id)) {
            types.erase(id);
            DataManager::getInstance().saveModule("location_types");
            
            json result;
            result["success"] = true;
            result["types"] = types;
            return jsonResponse(result);
        }
        return errorResponse("地点类型不存在");
    });
    
    CROW_ROUTE(app, "/api/map/structure-levels")([](){
        return jsonResponse(DataManager::getInstance().getModule("structure_levels"));
    });
    
    CROW_ROUTE(app, "/api/map/structure-levels/create").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("id", "");
        auto& levels = DataManager::getInstance().getModule("structure_levels");
        levels[id] = body;
        DataManager::getInstance().saveModule("structure_levels");
        
        json result;
        result["success"] = true;
        result["levels"] = levels;
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/map/structure-levels/edit").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("id", "");
        auto& levels = DataManager::getInstance().getModule("structure_levels");
        if (levels.contains(id)) {
            levels[id] = body;
            DataManager::getInstance().saveModule("structure_levels");
            
            json result;
            result["success"] = true;
            result["levels"] = levels;
            return jsonResponse(result);
        }
        return errorResponse("结构等级不存在");
    });
    
    CROW_ROUTE(app, "/api/map/structure-levels/delete").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("id", "");
        auto& levels = DataManager::getInstance().getModule("structure_levels");
        if (levels.contains(id)) {
            levels.erase(id);
            DataManager::getInstance().saveModule("structure_levels");
            
            json result;
            result["success"] = true;
            result["levels"] = levels;
            return jsonResponse(result);
        }
        return errorResponse("结构等级不存在");
    });
    
    // ==================== 人物关系模块 ====================
    
    CROW_ROUTE(app, "/api/characters")([](){
        auto& data = DataManager::getInstance().getModule("characters");
        json result;
        result["success"] = true;
        // 确保返回数组格式
        if (data.is_array()) {
            result["characters"] = data;
        } else {
            result["characters"] = json::array();
        }
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/characters/add").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string name = body.value("name", "");
        std::string avatar = body.value("avatar", "👤");
        std::string description = body.value("description", "");
        
        if (name.empty()) {
            return errorResponse("人物姓名不能为空");
        }
        
        auto& characters = DataManager::getInstance().getModule("characters");
        
        // 生成新ID
        auto now = std::chrono::system_clock::now();
        auto timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()).count();
        std::string new_id = "char_" + std::to_string(timestamp);
        
        json new_character;
        new_character["id"] = new_id;
        new_character["name"] = name;
        new_character["avatar"] = avatar.empty() ? "👤" : avatar;
        new_character["description"] = description;
        
        // 添加到数组
        json::array_t arr;
        if (characters.is_array()) {
            arr = characters.get<json::array_t>();
        }
        arr.push_back(new_character);
        characters = arr;
        
        DataManager::getInstance().saveModule("characters");
        
        json result;
        result["success"] = true;
        result["characters"] = characters;
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/characters/edit").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string character_id = body.value("id", "");
        std::string name = body.value("name", "");
        std::string avatar = body.value("avatar", "👤");
        std::string description = body.value("description", "");
        
        auto& characters = DataManager::getInstance().getModule("characters");
        
        if (characters.is_array()) {
            auto& arr = characters.get_ref<json::array_t&>();
            for (auto& ch : arr) {
                if (ch["id"].get<std::string>() == character_id) {
                    ch["name"] = name;
                    ch["avatar"] = avatar;
                    ch["description"] = description;
                    DataManager::getInstance().saveModule("characters");
                    
                    json result;
                    result["success"] = true;
                    result["characters"] = characters;
                    return jsonResponse(result);
                }
            }
        }
        return errorResponse("人物不存在");
    });
    
    CROW_ROUTE(app, "/api/characters/delete").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string character_id = body.value("id", "");
        
        auto& characters = DataManager::getInstance().getModule("characters");
        
        if (characters.is_array()) {
            auto& arr = characters.get_ref<json::array_t&>();
            arr.erase(
                std::remove_if(arr.begin(), arr.end(),
                    [&character_id](const json& ch) {
                        return ch["id"].get<std::string>() == character_id;
                    }
                ),
                arr.end()
            );
            DataManager::getInstance().saveModule("characters");
            
            json result;
            result["success"] = true;
            result["characters"] = characters;
            return jsonResponse(result);
        }
        return errorResponse("人物不存在");
    });
    
    CROW_ROUTE(app, "/api/relations")([](){
        auto& data = DataManager::getInstance().getModule("relations");
        json result;
        result["success"] = true;
        // 确保返回数组格式
        if (data.is_array()) {
            result["relations"] = data;
        } else {
            result["relations"] = json::array();
        }
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/relations/add").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("id", "");
        
        auto& relations = DataManager::getInstance().getModule("relations");
        
        // 如果没有提供ID，生成新ID
        if (id.empty()) {
            auto now = std::chrono::system_clock::now();
            auto timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()).count();
            id = "rel_" + std::to_string(timestamp);
            body["id"] = id;
        }
        
        // 添加到数组
        json::array_t arr;
        if (relations.is_array()) {
            arr = relations.get<json::array_t>();
        }
        arr.push_back(body);
        relations = arr;
        
        DataManager::getInstance().saveModule("relations");
        
        json result;
        result["success"] = true;
        result["relations"] = relations;
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/relations/edit").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string relation_id = body.value("id", "");
        
        auto& relations = DataManager::getInstance().getModule("relations");
        
        if (relations.is_array()) {
            auto& arr = relations.get_ref<json::array_t&>();
            for (auto& rel : arr) {
                if (rel["id"].get<std::string>() == relation_id) {
                    for (auto& [key, value] : body.items()) {
                        rel[key] = value;
                    }
                    DataManager::getInstance().saveModule("relations");
                    
                    json result;
                    result["success"] = true;
                    result["relations"] = relations;
                    return jsonResponse(result);
                }
            }
        }
        return errorResponse("关系不存在");
    });
    
    CROW_ROUTE(app, "/api/relations/delete").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string relation_id = body.value("id", "");
        
        auto& relations = DataManager::getInstance().getModule("relations");
        
        if (relations.is_array()) {
            auto& arr = relations.get_ref<json::array_t&>();
            arr.erase(
                std::remove_if(arr.begin(), arr.end(),
                    [&relation_id](const json& rel) {
                        return rel["id"].get<std::string>() == relation_id;
                    }
                ),
                arr.end()
            );
            DataManager::getInstance().saveModule("relations");
            
            json result;
            result["success"] = true;
            result["relations"] = relations;
            return jsonResponse(result);
        }
        return errorResponse("关系不存在");
    });
    
    CROW_ROUTE(app, "/api/relation-types")([](){
        auto& data = DataManager::getInstance().getModule("relation_types");
        json result;
        result["success"] = true;
        // 确保返回数组格式
        if (data.is_array()) {
            result["relation_types"] = data;
        } else {
            result["relation_types"] = json::array();
        }
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/relation-types/add").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("id", "");
        
        auto& types = DataManager::getInstance().getModule("relation_types");
        
        // 如果没有提供ID，生成新ID
        if (id.empty()) {
            auto now = std::chrono::system_clock::now();
            auto timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()).count();
            id = "rt_" + std::to_string(timestamp);
            body["id"] = id;
        }
        
        // 添加到数组
        json::array_t arr;
        if (types.is_array()) {
            arr = types.get<json::array_t>();
        }
        arr.push_back(body);
        types = arr;
        
        DataManager::getInstance().saveModule("relation_types");
        
        json result;
        result["success"] = true;
        result["relation_types"] = types;
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/relation-types/edit").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string type_id = body.value("id", "");
        
        auto& types = DataManager::getInstance().getModule("relation_types");
        
        if (types.is_array()) {
            auto& arr = types.get_ref<json::array_t&>();
            for (auto& type : arr) {
                if (type["id"].get<std::string>() == type_id) {
                    for (auto& [key, value] : body.items()) {
                        type[key] = value;
                    }
                    DataManager::getInstance().saveModule("relation_types");
                    
                    json result;
                    result["success"] = true;
                    result["relation_types"] = types;
                    return jsonResponse(result);
                }
            }
        }
        return errorResponse("关系类型不存在");
    });
    
    CROW_ROUTE(app, "/api/relation-types/delete").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string type_id = body.value("id", "");
        
        auto& types = DataManager::getInstance().getModule("relation_types");
        
        if (types.is_array()) {
            auto& arr = types.get_ref<json::array_t&>();
            arr.erase(
                std::remove_if(arr.begin(), arr.end(),
                    [&type_id](const json& type) {
                        return type["id"].get<std::string>() == type_id;
                    }
                ),
                arr.end()
            );
            DataManager::getInstance().saveModule("relation_types");
            
            json result;
            result["success"] = true;
            result["relation_types"] = types;
            return jsonResponse(result);
        }
        return errorResponse("关系类型不存在");
    });
    
    // ==================== 自定义模块 ====================
    
    CROW_ROUTE(app, "/api/custom/categories")([](){
        return jsonResponse(DataManager::getInstance().getModule("custom_categories"));
    });
    
    CROW_ROUTE(app, "/api/custom/categories/create").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("category_id", body.value("id", ""));
        if (id.empty()) {
            // 生成ID
            auto now = std::chrono::system_clock::now();
            auto timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()).count();
            id = "cat_" + std::to_string(timestamp);
            body["id"] = id;
        }
        auto& categories = DataManager::getInstance().getModule("custom_categories");
        categories[id] = body;
        DataManager::getInstance().saveModule("custom_categories");
        
        json result;
        result["success"] = true;
        result["message"] = "自定义分类创建成功";
        result["categories"] = categories;
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/custom/categories/edit").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("category_id", body.value("id", ""));
        auto& categories = DataManager::getInstance().getModule("custom_categories");
        if (categories.contains(id)) {
            // 保留原有id
            body["id"] = id;
            categories[id] = body;
            DataManager::getInstance().saveModule("custom_categories");
            
            json result;
            result["success"] = true;
            result["message"] = "自定义分类更新成功";
            result["categories"] = categories;
            return jsonResponse(result);
        }
        return errorResponse("自定义分类不存在");
    });
    
    CROW_ROUTE(app, "/api/custom/categories/delete").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("category_id", body.value("id", ""));
        auto& categories = DataManager::getInstance().getModule("custom_categories");
        if (categories.contains(id)) {
            categories.erase(id);
            DataManager::getInstance().saveModule("custom_categories");
            
            json result;
            result["success"] = true;
            result["message"] = "自定义分类删除成功";
            result["categories"] = categories;
            return jsonResponse(result);
        }
        return errorResponse("自定义分类不存在");
    });
    
    CROW_ROUTE(app, "/api/custom/items")([](const crow::request& req){
        // 支持按分类筛选
        auto& items = DataManager::getInstance().getModule("custom_items");
        std::string category_id = "";
        
        // 从URL参数中获取category_id
        // 注意：cpp-httplib的request没有直接的get_param方法，需要自己解析
        // 这里简化处理，返回所有条目，前端自己筛选
        // 或者我们可以从url中解析
        
        // 转换为数组格式
        json::array_t items_arr;
        if (items.is_object()) {
            for (auto& [key, value] : items.items()) {
                json item = value;
                if (!item.contains("id")) {
                    item["id"] = key;
                }
                items_arr.push_back(item);
            }
        }
        
        return jsonResponse(items_arr);
    });
    
    CROW_ROUTE(app, "/api/custom/items/create").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string category_id = body.value("category_id", "");
        json item_data = body.contains("data") ? body["data"] : json::object();
        
        // 生成ID
        auto now = std::chrono::system_clock::now();
        auto timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()).count();
        std::string id = "item_" + std::to_string(timestamp);
        
        // 构建条目数据
        json item = item_data;
        item["id"] = id;
        item["category_id"] = category_id;
        
        auto& items = DataManager::getInstance().getModule("custom_items");
        items[id] = item;
        DataManager::getInstance().saveModule("custom_items");
        
        // 转换为数组格式返回
        json::array_t items_arr;
        if (items.is_object()) {
            for (auto& [key, value] : items.items()) {
                json it = value;
                if (!it.contains("id")) {
                    it["id"] = key;
                }
                items_arr.push_back(it);
            }
        }
        
        json result;
        result["success"] = true;
        result["message"] = "自定义条目创建成功";
        result["items"] = items_arr;
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/custom/items/edit").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("id", "");
        json item_data = body.contains("data") ? body["data"] : json::object();
        
        auto& items = DataManager::getInstance().getModule("custom_items");
        if (items.contains(id)) {
            // 保留原有数据，只更新传入的字段
            for (auto& [key, value] : item_data.items()) {
                items[id][key] = value;
            }
            DataManager::getInstance().saveModule("custom_items");
            
            // 转换为数组格式返回
            json::array_t items_arr;
            if (items.is_object()) {
                for (auto& [key, value] : items.items()) {
                    json it = value;
                    if (!it.contains("id")) {
                        it["id"] = key;
                    }
                    items_arr.push_back(it);
                }
            }
            
            json result;
            result["success"] = true;
            result["message"] = "自定义条目更新成功";
            result["items"] = items_arr;
            return jsonResponse(result);
        }
        return errorResponse("自定义条目不存在");
    });
    
    CROW_ROUTE(app, "/api/custom/items/delete").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string id = body.value("id", "");
        auto& items = DataManager::getInstance().getModule("custom_items");
        if (items.contains(id)) {
            items.erase(id);
            DataManager::getInstance().saveModule("custom_items");
            
            // 转换为数组格式返回
            json::array_t items_arr;
            if (items.is_object()) {
                for (auto& [key, value] : items.items()) {
                    json it = value;
                    if (!it.contains("id")) {
                        it["id"] = key;
                    }
                    items_arr.push_back(it);
                }
            }
            
            json result;
            result["success"] = true;
            result["message"] = "自定义条目删除成功";
            result["items"] = items_arr;
            return jsonResponse(result);
        }
        return errorResponse("自定义条目不存在");
    });
    
    // ==================== 工具/导出模块 ====================
    
    CROW_ROUTE(app, "/api/search").methods("POST"_method)([](const crow::request& req){
        json results;
        results["items"] = json::array();
        results["characters"] = json::array();
        results["locations"] = json::array();
        results["quests"] = json::array();
        return successResponse(results);
    });
    
    CROW_ROUTE(app, "/api/stats")([](){
        return jsonResponse(DataManager::getInstance().getModule("stats"));
    });
    
    CROW_ROUTE(app, "/api/backup").methods("POST"_method)([](const crow::request& req){
        std::string backupPath = DataManager::getInstance().createBackup();
        if (!backupPath.empty()) {
            json data;
            data["backup"] = backupPath;
            return successResponse(data);
        }
        return errorResponse("备份创建失败");
    });
    
    CROW_ROUTE(app, "/api/backup/clear").methods("POST"_method)([](const crow::request& req){
        // 先获取备份数量
        auto backupList = DataManager::getInstance().getBackupList();
        int count = backupList.size();
        
        bool success = DataManager::getInstance().clearBackups();
        if (success) {
            json result;
            result["success"] = true;
            result["message"] = "备份清空成功";
            result["count"] = count;
            return jsonResponse(result);
        }
        return errorResponse("备份清空失败");
    });
    
    // ==================== 导出功能 ====================
    
    // 获取导出设置
    CROW_ROUTE(app, "/api/export/settings")([](){
        auto& settings = DataManager::getInstance().getModule("settings");
        json result;
        result["export_detail"] = settings.value("export_detail", false);
        return jsonResponse(result);
    });
    
    // 保存导出设置
    CROW_ROUTE(app, "/api/export/settings/save").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        auto& settings = DataManager::getInstance().getModule("settings");
        
        if (body.contains("export_detail")) {
            settings["export_detail"] = body["export_detail"].get<bool>();
        }
        
        DataManager::getInstance().saveModule("settings");
        
        json result;
        result["success"] = true;
        result["export_detail"] = settings.value("export_detail", false);
        return jsonResponse(result);
    });
    
    // 一键导出所有模块（TXT格式，返回JSON供前端下载）
    CROW_ROUTE(app, "/api/export/txt")([](){
        bool detailed = getExportDetailMode();
        std::string content;
        
        // 获取导出顺序
        auto& exportOrder = DataManager::getInstance().getModule("export_order");
        std::vector<std::string> defaultOrder = {
            "character", "currency", "inventory", "equipment", 
            "quests", "skills", "story", "locations", 
            "relations", "item_library", "custom"
        };
        
        std::vector<std::string> order;
        if (exportOrder.is_array() && !exportOrder.empty()) {
            for (auto& item : exportOrder) {
                if (item.is_string()) {
                    order.push_back(item.get<std::string>());
                }
            }
        } else {
            order = defaultOrder;
        }
        
        // 按顺序导出每个模块
        for (auto& mod : order) {
            if (mod == "character") {
                content += exportCharacter(detailed);
            } else if (mod == "currency") {
                content += exportCurrency(detailed);
            } else if (mod == "inventory") {
                content += exportInventory(detailed);
            } else if (mod == "equipment") {
                content += exportEquipment(detailed);
            } else if (mod == "quests") {
                content += exportQuests(detailed);
            } else if (mod == "skills") {
                content += exportSkills(detailed);
            } else if (mod == "story") {
                content += exportStory(detailed);
            } else if (mod == "locations") {
                content += exportLocations(detailed);
            } else if (mod == "relations") {
                content += exportRelations(detailed);
            } else if (mod == "item_library" || mod == "itemlibrary") {
                content += exportItemLibrary(detailed);
            } else if (mod == "custom") {
                content += exportCustom(detailed);
            }
        }
        
        json result;
        result["success"] = true;
        result["content"] = content;
        result["filename"] = "小说数据导出.txt";
        return jsonResponse(result);
    });
    
    // 单模块导出（TXT格式，返回JSON供前端下载）
    CROW_ROUTE(app, "/api/export/module/<string>/txt")([](const std::string& module){
        bool detailed = getExportDetailMode();
        
        std::string content;
        std::string filename = module + ".txt";
        
        if (module == "character") {
            content = exportCharacter(detailed);
            filename = "角色信息.txt";
        } else if (module == "currency") {
            content = exportCurrency(detailed);
            filename = "货币.txt";
        } else if (module == "inventory") {
            content = exportInventory(detailed);
            filename = "背包物品.txt";
        } else if (module == "equipment") {
            content = exportEquipment(detailed);
            filename = "装备.txt";
        } else if (module == "quests") {
            content = exportQuests(detailed);
            filename = "任务.txt";
        } else if (module == "skills") {
            content = exportSkills(detailed);
            filename = "技能.txt";
        } else if (module == "story") {
            content = exportStory(detailed);
            filename = "剧情.txt";
        } else if (module == "locations") {
            content = exportLocations(detailed);
            filename = "地图地点.txt";
        } else if (module == "relations") {
            content = exportRelations(detailed);
            filename = "人物关系.txt";
        } else if (module == "item_library" || module == "itemlibrary") {
            content = exportItemLibrary(detailed);
            filename = "物品库.txt";
        } else if (module == "custom") {
            content = exportCustom(detailed);
            filename = "自定义数据.txt";
        } else {
            content = "未知模块: " + module + "\n";
        }
        
        json result;
        result["success"] = true;
        result["content"] = content;
        result["filename"] = filename;
        return jsonResponse(result);
    });
    
    // 自定义模块按分类导出
    CROW_ROUTE(app, "/api/export/custom/category/<string>/txt")([](const std::string& categoryId){
        bool detailed = getExportDetailMode();
        
        // 获取分类名称
        std::string categoryName;
        auto& categories = DataManager::getInstance().getModule("custom_categories");
        if (categories.is_object() && categories.contains(categoryId)) {
            auto& cat = categories[categoryId];
            if (cat.is_object()) {
                categoryName = cat.value("name", categoryId);
            }
        }
        
        std::string content = exportCustom(detailed, categoryId, categoryName);
        std::string filename = "自定义数据_" + categoryName + ".txt";
        
        json result;
        result["success"] = true;
        result["content"] = content;
        result["filename"] = filename;
        return jsonResponse(result);
    });
    
    // 导出顺序设置（保留原有接口）
    CROW_ROUTE(app, "/api/export/order")([](){
        return jsonResponse(DataManager::getInstance().getModule("export_order"));
    });
    
    CROW_ROUTE(app, "/api/export/order/save").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        DataManager::getInstance().getModule("export_order") = body;
        DataManager::getInstance().saveModule("export_order");
        
        json result;
        result["success"] = true;
        result["order"] = body;
        return jsonResponse(result);
    });


        CROW_ROUTE(app, "/api/buttons/config")([](){
        return jsonResponse(DataManager::getInstance().getModule("buttons_config"));
    });
    
    CROW_ROUTE(app, "/api/buttons/config/save").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        DataManager::getInstance().getModule("buttons_config") = body;
        DataManager::getInstance().saveModule("buttons_config");
        
        json result;
        result["success"] = true;
        result["config"] = body;
        return jsonResponse(result);
    });
    
    CROW_ROUTE(app, "/api/export/order")([](){
        return jsonResponse(DataManager::getInstance().getModule("export_order"));
    });
    
    CROW_ROUTE(app, "/api/export/order/save").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        DataManager::getInstance().getModule("export_order") = body;
        DataManager::getInstance().saveModule("export_order");
        
        json result;
        result["success"] = true;
        result["order"] = body;
        return jsonResponse(result);
    });
    
    // ==================== 启动服务器 ====================
    

    // 编辑物品库物品
    CROW_ROUTE(app, "/api/items/library/edit").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string itemId = body.value("item_id", body.value("id", ""));
        
        if (itemId.empty()) {
            return errorResponse("物品ID不能为空");
        }
        
        auto& itemLibrary = DataManager::getInstance().getModule("item_library");
        
        if (!itemLibrary.is_array()) {
            return errorResponse("物品库数据格式错误");
        }
        
        // 查找并更新物品
        bool found = false;
        for (auto& item : itemLibrary) {
            std::string id = item.value("id", "");
            if (id == itemId) {
                // 更新字段
                if (body.contains("name") && body["name"].is_string()) {
                    item["name"] = body["name"].get<std::string>();
                }
                if (body.contains("icon") && body["icon"].is_string()) {
                    item["icon"] = body["icon"].get<std::string>();
                }
                if (body.contains("type") && body["type"].is_string()) {
                    item["type"] = body["type"].get<std::string>();
                }
                if (body.contains("description") && body["description"].is_string()) {
                    item["description"] = body["description"].get<std::string>();
                }
                if (body.contains("category_id") && body["category_id"].is_string()) {
                    item["category_id"] = body["category_id"].get<std::string>();
                }
                if (body.contains("level") && body["level"].is_string()) {
                    item["level"] = body["level"].get<std::string>();
                }
                found = true;
                break;
            }
        }
        
        if (!found) {
            return errorResponse("物品不存在");
        }
        
        DataManager::getInstance().saveModule("item_library");
        
        json result;
        result["success"] = true;
        result["items"] = itemLibrary;
        return jsonResponse(result);
    });
    
    // 删除物品库物品
    CROW_ROUTE(app, "/api/items/library/delete").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string itemId = body.value("item_id", body.value("id", ""));
        
        if (itemId.empty()) {
            return errorResponse("物品ID不能为空");
        }
        
        auto& itemLibrary = DataManager::getInstance().getModule("item_library");
        
        if (!itemLibrary.is_array()) {
            return errorResponse("物品库数据格式错误");
        }
        
        // 查找并删除物品
        bool found = false;
        json newLibrary = json::array();
        for (auto& item : itemLibrary) {
            std::string id = item.value("id", "");
            if (id == itemId) {
                found = true;
            } else {
                newLibrary.push_back(item);
            }
        }
        
        if (!found) {
            return errorResponse("物品不存在");
        }
        
        itemLibrary = newLibrary;
        DataManager::getInstance().saveModule("item_library");
        
        json result;
        result["success"] = true;
        result["items"] = itemLibrary;
        return jsonResponse(result);
    });

    // ==================== 物品库分类系统 ====================
    
    // 获取分类列表
    CROW_ROUTE(app, "/api/items/categories")([](){
        auto& categories = DataManager::getInstance().getModule("item_categories");
        return jsonResponse(categories);
    });
    
    // 添加分类
    CROW_ROUTE(app, "/api/items/categories/add").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string name = body.value("name", "");
        std::string icon = body.value("icon", "📁");
        std::string description = body.value("description", "");
        std::string bindModule = body.value("bind_module", "");
        
        if (name.empty()) {
            return errorResponse("分类名称不能为空");
        }
        
        auto& categories = DataManager::getInstance().getModule("item_categories");
        
        // 生成唯一ID
        std::string catId = body.value("id", "");
        if (catId.empty()) {
            catId = "cat_" + std::to_string(std::chrono::system_clock::now().time_since_epoch().count());
        }
        
        json category;
        category["id"] = catId;
        category["name"] = name;
        category["icon"] = icon;
        category["description"] = description;
        category["bind_module"] = bindModule;
        category["created_at"] = std::to_string(std::chrono::system_clock::now().time_since_epoch().count());
        category["item_count"] = 0;
        
        categories[catId] = category;
        DataManager::getInstance().saveModule("item_categories");
        
        json result;
        result["success"] = true;
        result["category"] = category;
        result["categories"] = categories;
        return jsonResponse(result);
    });
    
    // 编辑分类
    CROW_ROUTE(app, "/api/items/categories/edit").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string catId = body.value("category_id", body.value("id", ""));
        
        if (catId.empty()) {
            return errorResponse("分类ID不能为空");
        }
        
        auto& categories = DataManager::getInstance().getModule("item_categories");
        
        // 检查分类是否存在（用遍历方式）
        bool exists = false;
        if (categories.is_object()) {
            for (auto& [key, value] : categories.items()) {
                if (key == catId) {
                    exists = true;
                    break;
                }
            }
        }
        
        if (!exists) {
            return errorResponse("分类不存在");
        }
        
        // 更新字段
        if (body.contains("name") && body["name"].is_string()) {
            categories[catId]["name"] = body["name"].get<std::string>();
        }
        if (body.contains("icon") && body["icon"].is_string()) {
            categories[catId]["icon"] = body["icon"].get<std::string>();
        }
        if (body.contains("description") && body["description"].is_string()) {
            categories[catId]["description"] = body["description"].get<std::string>();
        }
        if (body.contains("bind_module") && body["bind_module"].is_string()) {
            categories[catId]["bind_module"] = body["bind_module"].get<std::string>();
        }
        
        DataManager::getInstance().saveModule("item_categories");
        
        json result;
        result["success"] = true;
        result["category"] = categories[catId];
        result["categories"] = categories;
        return jsonResponse(result);
    });
    
    // 删除分类
    CROW_ROUTE(app, "/api/items/categories/delete").methods("POST"_method)([](const crow::request& req){
        auto body = parseBody(req);
        std::string catId = body.value("category_id", body.value("id", ""));
        
        if (catId.empty()) {
            return errorResponse("分类ID不能为空");
        }
        
        auto& categories = DataManager::getInstance().getModule("item_categories");
        
        // 检查分类是否存在（用遍历方式）
        bool exists = false;
        if (categories.is_object()) {
            for (auto& [key, value] : categories.items()) {
                if (key == catId) {
                    exists = true;
                    break;
                }
            }
        }
        
        if (!exists) {
            return errorResponse("分类不存在");
        }
        
        categories.erase(catId);
        DataManager::getInstance().saveModule("item_categories");
        
        json result;
        result["success"] = true;
        result["categories"] = categories;
        return jsonResponse(result);
    });

    app.port(5000).multithreaded().run();
    

    return 0;
}
