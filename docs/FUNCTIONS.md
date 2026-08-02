# 小说数据管理器 v3.0 - 函数清单文档

## 文档说明

本文档列出了小说数据管理器 v3.0 中所有用到的函数，注明其意义、注释、对应效果、对应模块、位置等信息。

---

## 目录

1. [工具函数层 - helpers.py](#工具函数层---helperspy)
2. [存储工具层 - storage.py](#存储工具层---storagepy)
3. [数据管理层 - data_manager.py](#数据管理层---data_managerpy)
4. [UI组件层 - 卡片组件 card.py](#ui组件层---卡片组件-cardpy)
5. [UI组件层 - 弹窗组件 modal.py](#ui组件层---弹窗组件-modalpy)
6. [UI组件层 - Toast组件 toast.py](#ui组件层---toast组件-toastpy)
7. [UI层 - 基础屏幕 base_screen.py](#ui层---基础屏幕-base_screenpy)
8. [UI层 - 角色屏幕 character_screen.py](#ui层---角色屏幕-character_screenpy)
9. [UI层 - 货币屏幕 currency_screen.py](#ui层---货币屏幕-currency_screenpy)
10. [UI层 - 背包屏幕 inventory_screen.py](#ui层---背包屏幕-inventory_screenpy)
11. [UI层 - 装备屏幕 equipment_screen.py](#ui层---装备屏幕-equipment_screenpy)
12. [UI层 - 任务屏幕 quest_screen.py](#ui层---任务屏幕-quest_screenpy)
13. [UI层 - 技能屏幕 skill_screen.py](#ui层---技能屏幕-skill_screenpy)
14. [UI层 - 剧情标记屏幕 story_screen.py](#ui层---剧情标记屏幕-story_screenpy)
15. [UI层 - 伏笔屏幕 foreshadowing_screen.py](#ui层---伏笔屏幕-foreshadowing_screenpy)
16. [UI层 - 自定义数据屏幕 custom_screen.py](#ui层---自定义数据屏幕-custom_screenpy)
17. [UI层 - 数据预览屏幕 preview_screen.py](#ui层---数据预览屏幕-preview_screenpy)
18. [应用层 - app.py](#应用层---apppy)
19. [主程序入口 - main.py](#主程序入口---mainpy)

---

## 工具函数层 - helpers.py

**文件位置**：`src/utils/helpers.py`

**所属模块**：工具函数层

### 函数列表

#### 1. generate_id

```python
def generate_id(prefix: str = "item") -> str
```

**功能说明**：生成唯一ID

**参数**：
- `prefix` (str): ID前缀，默认为"item"

**返回值**：
- `str`: 生成的唯一ID字符串

**效果**：生成一个带前缀的唯一ID，格式为"prefix_时间戳_随机数"

**位置**：`src/utils/helpers.py - generate_id`

---

#### 2. safe_get

```python
def safe_get(data: dict, key: str, default=None) -> Any
```

**功能说明**：安全获取字典值

**参数**：
- `data` (dict): 字典数据
- `key` (str): 键名
- `default`: 默认值，键不存在时返回

**返回值**：
- `Any`: 键对应的值或默认值

**效果**：安全地获取字典中的值，避免KeyError异常

**位置**：`src/utils/helpers.py - safe_get`

---

#### 3. format_number

```python
def format_number(num: float) -> str
```

**功能说明**：格式化数字显示

**参数**：
- `num` (float): 数字

**返回值**：
- `str`: 格式化后的数字字符串

**效果**：将数字格式化为易读的字符串，整数显示为整数，小数保留两位

**位置**：`src/utils/helpers.py - format_number`

---

#### 4. validate_required_fields

```python
def validate_required_fields(data: dict, required_fields: list) -> tuple[bool, list]
```

**功能说明**：验证必填字段

**参数**：
- `data` (dict): 数据字典
- `required_fields` (list): 必填字段列表

**返回值**：
- `tuple[bool, list]`: (是否通过验证, 缺失的字段列表)

**效果**：检查数据中是否包含所有必填字段，返回验证结果和缺失字段

**位置**：`src/utils/helpers.py - validate_required_fields`

---

#### 5. deep_copy

```python
def deep_copy(data: Any) -> Any
```

**功能说明**：深拷贝数据

**参数**：
- `data` (Any): 要拷贝的数据

**返回值**：
- `Any`: 深拷贝后的数据

**效果**：创建数据的深拷贝，避免引用传递问题

**位置**：`src/utils/helpers.py - deep_copy`

---

#### 6. truncate_text

```python
def truncate_text(text: str, max_length: int = 50) -> str
```

**功能说明**：截断文本

**参数**：
- `text` (str): 原始文本
- `max_length` (int): 最大长度，默认为50

**返回值**：
- `str`: 截断后的文本

**效果**：如果文本超过指定长度，截断并添加省略号

**位置**：`src/utils/helpers.py - truncate_text`

---

## 存储工具层 - storage.py

**文件位置**：`src/utils/storage.py`

**所属模块**：存储工具层

### 类：StorageManager

#### 1. __init__

```python
def __init__(self, data_dir: str = "data")
```

**功能说明**：初始化存储管理器

**参数**：
- `data_dir` (str): 数据目录路径，默认为"data"

**返回值**：
- 无

**效果**：创建存储管理器实例，确保数据目录存在

**位置**：`src/utils/storage.py - StorageManager.__init__`

---

#### 2. _ensure_directories

```python
def _ensure_directories(self)
```

**功能说明**：确保目录存在

**参数**：
- 无

**返回值**：
- 无

**效果**：检查并创建数据目录和备份目录（如果不存在）

**位置**：`src/utils/storage.py - StorageManager._ensure_directories`

---

#### 3. load_data

```python
def load_data(self) -> Dict
```

**功能说明**：加载所有数据

**参数**：
- 无

**返回值**：
- `Dict`: 加载的数据字典

**效果**：从JSON文件加载所有数据，如果文件不存在则返回默认数据

**位置**：`src/utils/storage.py - StorageManager.load_data`

---

#### 4. save_data

```python
def save_data(self, data: Dict) -> bool
```

**功能说明**：保存所有数据

**参数**：
- `data` (Dict): 要保存的数据字典

**返回值**：
- `bool`: 保存是否成功

**效果**：将数据保存到JSON文件中

**位置**：`src/utils/storage.py - StorageManager.save_data`

---

#### 5. create_backup

```python
def create_backup(self, data: Dict) -> Optional[str]
```

**功能说明**：创建数据备份

**参数**：
- `data` (Dict): 要备份的数据

**返回值**：
- `Optional[str]`: 备份文件名，失败返回None

**效果**：创建数据的备份文件，文件名包含时间戳

**位置**：`src/utils/storage.py - StorageManager.create_backup`

---

#### 6. list_backups

```python
def list_backups(self) -> list
```

**功能说明**：列出所有备份

**参数**：
- 无

**返回值**：
- `list`: 备份文件名列表

**效果**：列出备份目录中的所有备份文件

**位置**：`src/utils/storage.py - StorageManager.list_backups`

---

#### 7. restore_backup

```python
def restore_backup(self, backup_filename: str) -> Optional[Dict]
```

**功能说明**：从备份恢复

**参数**：
- `backup_filename` (str): 备份文件名

**返回值**：
- `Optional[Dict]`: 恢复的数据，失败返回None

**效果**：从指定的备份文件中恢复数据

**位置**：`src/utils/storage.py - StorageManager.restore_backup`

---

#### 8. delete_backup

```python
def delete_backup(self, backup_filename: str) -> bool
```

**功能说明**：删除备份

**参数**：
- `backup_filename` (str): 备份文件名

**返回值**：
- `bool`: 删除是否成功

**效果**：删除指定的备份文件

**位置**：`src/utils/storage.py - StorageManager.delete_backup`

---

#### 9. clear_all_backups

```python
def clear_all_backups(self) -> int
```

**功能说明**：清空所有备份

**参数**：
- 无

**返回值**：
- `int`: 删除的备份文件数量

**效果**：删除备份目录中的所有备份文件

**位置**：`src/utils/storage.py - StorageManager.clear_all_backups`

---

#### 10. _get_default_data

```python
def _get_default_data(self) -> Dict
```

**功能说明**：获取默认数据

**参数**：
- 无

**返回值**：
- `Dict`: 默认数据结构

**效果**：返回包含所有模块默认数据的字典

**位置**：`src/utils/storage.py - StorageManager._get_default_data`

---

#### 11. _merge_with_default

```python
def _merge_with_default(self, data: Dict) -> Dict
```

**功能说明**：合并默认数据

**参数**：
- `data` (Dict): 现有数据

**返回值**：
- `Dict`: 合并后的数据

**效果**：将现有数据与默认数据合并，确保所有字段都存在

**位置**：`src/utils/storage.py - StorageManager._merge_with_default`

---

## 数据管理层 - data_manager.py

**文件位置**：`src/data_manager.py`

**所属模块**：数据管理层

### 类：DataManager

#### 基础功能

##### 1. __init__

```python
def __init__(self, data_dir: str = "data")
```

**功能说明**：初始化数据管理器

**参数**：
- `data_dir` (str): 数据目录路径

**返回值**：
- 无

**效果**：创建数据管理器实例，加载数据，初始化监听器列表

**位置**：`src/data_manager.py - DataManager.__init__`

---

##### 2. save

```python
def save(self) -> bool
```

**功能说明**：保存所有数据

**参数**：
- 无

**返回值**：
- `bool`: 保存是否成功

**效果**：将当前数据保存到文件，并通知监听器

**位置**：`src/data_manager.py - DataManager.save`

---

##### 3. create_backup

```python
def create_backup(self) -> Optional[str]
```

**功能说明**：创建备份

**参数**：
- 无

**返回值**：
- `Optional[str]`: 备份文件名

**效果**：创建当前数据的备份

**位置**：`src/data_manager.py - DataManager.create_backup`

---

##### 4. list_backups

```python
def list_backups(self) -> list
```

**功能说明**：列出备份

**参数**：
- 无

**返回值**：
- `list`: 备份文件名列表

**效果**：列出所有备份文件

**位置**：`src/data_manager.py - DataManager.list_backups`

---

##### 5. restore_backup

```python
def restore_backup(self, backup_filename: str) -> bool
```

**功能说明**：恢复备份

**参数**：
- `backup_filename` (str): 备份文件名

**返回值**：
- `bool`: 恢复是否成功

**效果**：从指定备份恢复数据，并通知监听器

**位置**：`src/data_manager.py - DataManager.restore_backup`

---

##### 6. delete_backup

```python
def delete_backup(self, backup_filename: str) -> bool
```

**功能说明**：删除备份

**参数**：
- `backup_filename` (str): 备份文件名

**返回值**：
- `bool`: 删除是否成功

**效果**：删除指定的备份文件

**位置**：`src/data_manager.py - DataManager.delete_backup`

---

##### 7. clear_all_backups

```python
def clear_all_backups(self) -> int
```

**功能说明**：清空所有备份

**参数**：
- 无

**返回值**：
- `int`: 删除的备份数量

**效果**：删除所有备份文件

**位置**：`src/data_manager.py - DataManager.clear_all_backups`

---

##### 8. search_all

```python
def search_all(self, keyword: str) -> Dict
```

**功能说明**：全局搜索

**参数**：
- `keyword` (str): 搜索关键词

**返回值**：
- `Dict`: 搜索结果，按模块分类

**效果**：在所有数据中搜索包含关键词的内容

**位置**：`src/data_manager.py - DataManager.search_all`

---

##### 9. add_listener

```python
def add_listener(self, callback)
```

**功能说明**：添加监听器

**参数**：
- `callback` (function): 回调函数

**返回值**：
- 无

**效果**：添加数据变更监听器，数据变更时会调用回调

**位置**：`src/data_manager.py - DataManager.add_listener`

---

##### 10. remove_listener

```python
def remove_listener(self, callback)
```

**功能说明**：移除监听器

**参数**：
- `callback` (function): 回调函数

**返回值**：
- 无

**效果**：移除指定的数据变更监听器

**位置**：`src/data_manager.py - DataManager.remove_listener`

---

##### 11. _notify_listeners

```python
def _notify_listeners(self, event_type: str)
```

**功能说明**：通知监听器

**参数**：
- `event_type` (str): 事件类型

**返回值**：
- 无

**效果**：通知所有监听器数据发生了变更

**位置**：`src/data_manager.py - DataManager._notify_listeners`

---

#### 角色模块

##### 12. get_character

```python
def get_character(self) -> Dict
```

**功能说明**：获取角色信息

**参数**：
- 无

**返回值**：
- `Dict`: 角色信息字典

**效果**：返回角色的基本信息（名称、等级、描述等）

**位置**：`src/data_manager.py - DataManager.get_character`

---

##### 13. update_character

```python
def update_character(self, character_data: Dict) -> bool
```

**功能说明**：更新角色信息

**参数**：
- `character_data` (Dict): 角色数据

**返回值**：
- `bool`: 更新是否成功

**效果**：更新角色的基本信息

**位置**：`src/data_manager.py - DataManager.update_character`

---

##### 14. get_character_stats

```python
def get_character_stats(self) -> Dict
```

**功能说明**：获取角色属性

**参数**：
- 无

**返回值**：
- `Dict`: 角色属性字典

**效果**：返回角色的所有属性

**位置**：`src/data_manager.py - DataManager.get_character_stats`

---

##### 15. update_character_stat

```python
def update_character_stat(self, stat_name: str, value) -> bool
```

**功能说明**：更新单个属性

**参数**：
- `stat_name` (str): 属性名
- `value`: 属性值

**返回值**：
- `bool`: 更新是否成功

**效果**：更新角色的单个属性值

**位置**：`src/data_manager.py - DataManager.update_character_stat`

---

##### 16. delete_character_stat

```python
def delete_character_stat(self, stat_name: str) -> bool
```

**功能说明**：删除属性

**参数**：
- `stat_name` (str): 属性名

**返回值**：
- `bool`: 删除是否成功

**效果**：删除角色的指定属性

**位置**：`src/data_manager.py - DataManager.delete_character_stat`

---

#### 货币模块

##### 17. get_currency

```python
def get_currency(self) -> Dict
```

**功能说明**：获取所有货币

**参数**：
- 无

**返回值**：
- `Dict`: 货币字典（类型ID -> 数量）

**效果**：返回所有类型货币的数量

**位置**：`src/data_manager.py - DataManager.get_currency`

---

##### 18. get_currency_amount

```python
def get_currency_amount(self, currency_type: str) -> float
```

**功能说明**：获取指定货币数量

**参数**：
- `currency_type` (str): 货币类型ID

**返回值**：
- `float`: 货币数量

**效果**：返回指定类型货币的数量

**位置**：`src/data_manager.py - DataManager.get_currency_amount`

---

##### 19. add_currency

```python
def add_currency(self, currency_type: str, amount: float) -> bool
```

**功能说明**：增加货币

**参数**：
- `currency_type` (str): 货币类型ID
- `amount` (float): 增加的数量

**返回值**：
- `bool`: 操作是否成功

**效果**：增加指定类型货币的数量

**位置**：`src/data_manager.py - DataManager.add_currency`

---

##### 20. subtract_currency

```python
def subtract_currency(self, currency_type: str, amount: float) -> bool
```

**功能说明**：扣除货币

**参数**：
- `currency_type` (str): 货币类型ID
- `amount` (float): 扣除的数量

**返回值**：
- `bool`: 操作是否成功（数量不足时返回False）

**效果**：扣除指定类型货币的数量，数量不足时不扣除

**位置**：`src/data_manager.py - DataManager.subtract_currency`

---

##### 21. set_currency

```python
def set_currency(self, currency_type: str, amount: float) -> bool
```

**功能说明**：设置货币数量

**参数**：
- `currency_type` (str): 货币类型ID
- `amount` (float): 设置的数量

**返回值**：
- `bool`: 操作是否成功

**效果**：直接设置指定类型货币的数量

**位置**：`src/data_manager.py - DataManager.set_currency`

---

##### 22. get_currency_types

```python
def get_currency_types(self) -> Dict
```

**功能说明**：获取货币类型列表

**参数**：
- 无

**返回值**：
- `Dict`: 货币类型字典（类型ID -> 类型配置）

**效果**：返回所有货币类型的配置信息

**位置**：`src/data_manager.py - DataManager.get_currency_types`

---

##### 23. add_currency_type

```python
def add_currency_type(self, type_id: str, type_data: Dict) -> bool
```

**功能说明**：添加货币类型

**参数**：
- `type_id` (str): 类型ID
- `type_data` (Dict): 类型配置数据

**返回值**：
- `bool`: 添加是否成功

**效果**：添加新的货币类型

**位置**：`src/data_manager.py - DataManager.add_currency_type`

---

##### 24. delete_currency_type

```python
def delete_currency_type(self, type_id: str) -> bool
```

**功能说明**：删除货币类型

**参数**：
- `type_id` (str): 类型ID

**返回值**：
- `bool`: 删除是否成功

**效果**：删除指定的货币类型及其数量

**位置**：`src/data_manager.py - DataManager.delete_currency_type`

---

#### 背包模块

##### 25. get_inventory

```python
def get_inventory(self) -> List
```

**功能说明**：获取背包物品列表

**参数**：
- 无

**返回值**：
- `List`: 物品列表

**效果**：返回背包中的所有物品

**位置**：`src/data_manager.py - DataManager.get_inventory`

---

##### 26. add_inventory_item

```python
def add_inventory_item(self, item: Dict) -> str
```

**功能说明**：添加背包物品

**参数**：
- `item` (Dict): 物品数据

**返回值**：
- `str`: 新物品的ID

**效果**：向背包中添加新物品

**位置**：`src/data_manager.py - DataManager.add_inventory_item`

---

##### 27. update_inventory_item

```python
def update_inventory_item(self, item_id: str, item_data: Dict) -> bool
```

**功能说明**：更新背包物品

**参数**：
- `item_id` (str): 物品ID
- `item_data` (Dict): 物品数据

**返回值**：
- `bool`: 更新是否成功

**效果**：更新背包中指定物品的数据

**位置**：`src/data_manager.py - DataManager.update_inventory_item`

---

##### 28. delete_inventory_item

```python
def delete_inventory_item(self, item_id: str) -> bool
```

**功能说明**：删除背包物品

**参数**：
- `item_id` (str): 物品ID

**返回值**：
- `bool`: 删除是否成功

**效果**：从背包中删除指定物品

**位置**：`src/data_manager.py - DataManager.delete_inventory_item`

---

##### 29. get_inventory_item

```python
def get_inventory_item(self, item_id: str) -> Optional[Dict]
```

**功能说明**：获取单个物品

**参数**：
- `item_id` (str): 物品ID

**返回值**：
- `Optional[Dict]`: 物品数据，不存在返回None

**效果**：获取背包中指定ID的物品

**位置**：`src/data_manager.py - DataManager.get_inventory_item`

---

#### 装备模块

##### 30. get_equipment_slots

```python
def get_equipment_slots(self) -> Dict
```

**功能说明**：获取装备槽位列表

**参数**：
- 无

**返回值**：
- `Dict`: 装备槽位字典（槽位ID -> 槽位配置）

**效果**：返回所有装备槽位的配置信息

**位置**：`src/data_manager.py - DataManager.get_equipment_slots`

---

##### 31. add_equipment_slot

```python
def add_equipment_slot(self, slot_id: str, slot_data: Dict) -> bool
```

**功能说明**：添加装备槽位

**参数**：
- `slot_id` (str): 槽位ID
- `slot_data` (Dict): 槽位配置数据

**返回值**：
- `bool`: 添加是否成功

**效果**：添加新的装备槽位

**位置**：`src/data_manager.py - DataManager.add_equipment_slot`

---

##### 32. delete_equipment_slot

```python
def delete_equipment_slot(self, slot_id: str) -> bool
```

**功能说明**：删除装备槽位

**参数**：
- `slot_id` (str): 槽位ID

**返回值**：
- `bool`: 删除是否成功

**效果**：删除指定的装备槽位及其装备

**位置**：`src/data_manager.py - DataManager.delete_equipment_slot`

---

##### 33. get_equipment

```python
def get_equipment(self) -> Dict
```

**功能说明**：获取已装备物品

**参数**：
- 无

**返回值**：
- `Dict`: 已装备物品字典（槽位ID -> 物品）

**效果**：返回所有槽位上已装备的物品

**位置**：`src/data_manager.py - DataManager.get_equipment`

---

##### 34. equip_item

```python
def equip_item(self, slot_id: str, item: Dict) -> bool
```

**功能说明**：装备物品

**参数**：
- `slot_id` (str): 槽位ID
- `item` (Dict): 物品数据

**返回值**：
- `bool`: 装备是否成功

**效果**：将物品装备到指定槽位

**位置**：`src/data_manager.py - DataManager.equip_item`

---

##### 35. unequip_item

```python
def unequip_item(self, slot_id: str) -> Optional[Dict]
```

**功能说明**：卸下装备

**参数**：
- `slot_id` (str): 槽位ID

**返回值**：
- `Optional[Dict]`: 卸下的物品，槽位为空返回None

**效果**：卸下指定槽位上的装备

**位置**：`src/data_manager.py - DataManager.unequip_item`

---

##### 36. get_equipped_item

```python
def get_equipped_item(self, slot_id: str) -> Optional[Dict]
```

**功能说明**：获取指定槽位装备

**参数**：
- `slot_id` (str): 槽位ID

**返回值**：
- `Optional[Dict]`: 装备物品，槽位为空返回None

**效果**：获取指定槽位上装备的物品

**位置**：`src/data_manager.py - DataManager.get_equipped_item`

---

#### 任务模块

##### 37. get_quests

```python
def get_quests(self) -> List
```

**功能说明**：获取任务列表

**参数**：
- 无

**返回值**：
- `List`: 任务列表

**效果**：返回所有任务

**位置**：`src/data_manager.py - DataManager.get_quests`

---

##### 38. add_quest

```python
def add_quest(self, quest: Dict) -> str
```

**功能说明**：添加任务

**参数**：
- `quest` (Dict): 任务数据

**返回值**：
- `str`: 新任务的ID

**效果**：添加新的任务

**位置**：`src/data_manager.py - DataManager.add_quest`

---

##### 39. update_quest

```python
def update_quest(self, quest_id: str, quest_data: Dict) -> bool
```

**功能说明**：更新任务

**参数**：
- `quest_id` (str): 任务ID
- `quest_data` (Dict): 任务数据

**返回值**：
- `bool`: 更新是否成功

**效果**：更新指定任务的数据

**位置**：`src/data_manager.py - DataManager.update_quest`

---

##### 40. delete_quest

```python
def delete_quest(self, quest_id: str) -> bool
```

**功能说明**：删除任务

**参数**：
- `quest_id` (str): 任务ID

**返回值**：
- `bool`: 删除是否成功

**效果**：删除指定的任务

**位置**：`src/data_manager.py - DataManager.delete_quest`

---

##### 41. complete_quest

```python
def complete_quest(self, quest_id: str) -> bool
```

**功能说明**：完成任务

**参数**：
- `quest_id` (str): 任务ID

**返回值**：
- `bool`: 操作是否成功

**效果**：将任务标记为已完成

**位置**：`src/data_manager.py - DataManager.complete_quest`

---

#### 技能模块

##### 42. get_skills

```python
def get_skills(self) -> List
```

**功能说明**：获取技能列表

**参数**：
- 无

**返回值**：
- `List`: 技能列表

**效果**：返回所有技能

**位置**：`src/data_manager.py - DataManager.get_skills`

---

##### 43. add_skill

```python
def add_skill(self, skill: Dict) -> str
```

**功能说明**：添加技能

**参数**：
- `skill` (Dict): 技能数据

**返回值**：
- `str`: 新技能的ID

**效果**：添加新的技能

**位置**：`src/data_manager.py - DataManager.add_skill`

---

##### 44. update_skill

```python
def update_skill(self, skill_id: str, skill_data: Dict) -> bool
```

**功能说明**：更新技能

**参数**：
- `skill_id` (str): 技能ID
- `skill_data` (Dict): 技能数据

**返回值**：
- `bool`: 更新是否成功

**效果**：更新指定技能的数据

**位置**：`src/data_manager.py - DataManager.update_skill`

---

##### 45. delete_skill

```python
def delete_skill(self, skill_id: str) -> bool
```

**功能说明**：删除技能

**参数**：
- `skill_id` (str): 技能ID

**返回值**：
- `bool`: 删除是否成功

**效果**：删除指定的技能

**位置**：`src/data_manager.py - DataManager.delete_skill`

---

##### 46. upgrade_skill

```python
def upgrade_skill(self, skill_id: str) -> bool
```

**功能说明**：升级技能

**参数**：
- `skill_id` (str): 技能ID

**返回值**：
- `bool`: 操作是否成功

**效果**：将技能等级提升1级

**位置**：`src/data_manager.py - DataManager.upgrade_skill`

---

#### 剧情标记模块

##### 47. get_story_marks

```python
def get_story_marks(self) -> List
```

**功能说明**：获取剧情标记列表

**参数**：
- 无

**返回值**：
- `List`: 剧情标记列表

**效果**：返回所有剧情标记

**位置**：`src/data_manager.py - DataManager.get_story_marks`

---

##### 48. add_story_mark

```python
def add_story_mark(self, mark: Dict) -> str
```

**功能说明**：添加剧情标记

**参数**：
- `mark` (Dict): 标记数据

**返回值**：
- `str`: 新标记的ID

**效果**：添加新的剧情标记

**位置**：`src/data_manager.py - DataManager.add_story_mark`

---

##### 49. update_story_mark

```python
def update_story_mark(self, mark_id: str, mark_data: Dict) -> bool
```

**功能说明**：更新剧情标记

**参数**：
- `mark_id` (str): 标记ID
- `mark_data` (Dict): 标记数据

**返回值**：
- `bool`: 更新是否成功

**效果**：更新指定剧情标记的数据

**位置**：`src/data_manager.py - DataManager.update_story_mark`

---

##### 50. delete_story_mark

```python
def delete_story_mark(self, mark_id: str) -> bool
```

**功能说明**：删除剧情标记

**参数**：
- `mark_id` (str): 标记ID

**返回值**：
- `bool`: 删除是否成功

**效果**：删除指定的剧情标记

**位置**：`src/data_manager.py - DataManager.delete_story_mark`

---

#### 伏笔模块

##### 51. get_foreshadowing

```python
def get_foreshadowing(self) -> List
```

**功能说明**：获取伏笔列表

**参数**：
- 无

**返回值**：
- `List`: 伏笔列表

**效果**：返回所有伏笔

**位置**：`src/data_manager.py - DataManager.get_foreshadowing`

---

##### 52. add_foreshadowing

```python
def add_foreshadowing(self, foreshadowing: Dict) -> str
```

**功能说明**：添加伏笔

**参数**：
- `foreshadowing` (Dict): 伏笔数据

**返回值**：
- `str`: 新伏笔的ID

**效果**：添加新的伏笔

**位置**：`src/data_manager.py - DataManager.add_foreshadowing`

---

##### 53. update_foreshadowing

```python
def update_foreshadowing(self, foreshadowing_id: str, data: Dict) -> bool
```

**功能说明**：更新伏笔

**参数**：
- `foreshadowing_id` (str): 伏笔ID
- `data` (Dict): 伏笔数据

**返回值**：
- `bool`: 更新是否成功

**效果**：更新指定伏笔的数据

**位置**：`src/data_manager.py - DataManager.update_foreshadowing`

---

##### 54. delete_foreshadowing

```python
def delete_foreshadowing(self, foreshadowing_id: str) -> bool
```

**功能说明**：删除伏笔

**参数**：
- `foreshadowing_id` (str): 伏笔ID

**返回值**：
- `bool`: 删除是否成功

**效果**：删除指定的伏笔

**位置**：`src/data_manager.py - DataManager.delete_foreshadowing`

---

##### 55. resolve_foreshadowing

```python
def resolve_foreshadowing(self, foreshadowing_id: str) -> bool
```

**功能说明**：回收伏笔

**参数**：
- `foreshadowing_id` (str): 伏笔ID

**返回值**：
- `bool`: 操作是否成功

**效果**：将伏笔标记为已回收

**位置**：`src/data_manager.py - DataManager.resolve_foreshadowing`

---

#### 自定义数据模块

##### 56. get_custom_categories

```python
def get_custom_categories(self) -> Dict
```

**功能说明**：获取自定义分类列表

**参数**：
- 无

**返回值**：
- `Dict`: 自定义分类字典（分类ID -> 分类配置）

**效果**：返回所有自定义分类

**位置**：`src/data_manager.py - DataManager.get_custom_categories`

---

##### 57. add_custom_category

```python
def add_custom_category(self, category_id: str, category_data: Dict) -> bool
```

**功能说明**：添加自定义分类

**参数**：
- `category_id` (str): 分类ID
- `category_data` (Dict): 分类配置数据

**返回值**：
- `bool`: 添加是否成功

**效果**：添加新的自定义分类

**位置**：`src/data_manager.py - DataManager.add_custom_category`

---

##### 58. delete_custom_category

```python
def delete_custom_category(self, category_id: str) -> bool
```

**功能说明**：删除自定义分类

**参数**：
- `category_id` (str): 分类ID

**返回值**：
- `bool`: 删除是否成功

**效果**：删除指定的自定义分类及其所有条目

**位置**：`src/data_manager.py - DataManager.delete_custom_category`

---

##### 59. get_custom_items

```python
def get_custom_items(self, category_id: str) -> List
```

**功能说明**：获取自定义条目列表

**参数**：
- `category_id` (str): 分类ID

**返回值**：
- `List`: 自定义条目列表

**效果**：返回指定分类下的所有条目

**位置**：`src/data_manager.py - DataManager.get_custom_items`

---

##### 60. add_custom_item

```python
def add_custom_item(self, category_id: str, item: Dict) -> str
```

**功能说明**：添加自定义条目

**参数**：
- `category_id` (str): 分类ID
- `item` (Dict): 条目数据

**返回值**：
- `str`: 新条目的ID

**效果**：向指定分类添加新条目

**位置**：`src/data_manager.py - DataManager.add_custom_item`

---

##### 61. update_custom_item

```python
def update_custom_item(self, category_id: str, item_id: str, item_data: Dict) -> bool
```

**功能说明**：更新自定义条目

**参数**：
- `category_id` (str): 分类ID
- `item_id` (str): 条目ID
- `item_data` (Dict): 条目数据

**返回值**：
- `bool`: 更新是否成功

**效果**：更新指定分类下的指定条目

**位置**：`src/data_manager.py - DataManager.update_custom_item`

---

##### 62. delete_custom_item

```python
def delete_custom_item(self, category_id: str, item_id: str) -> bool
```

**功能说明**：删除自定义条目

**参数**：
- `category_id` (str): 分类ID
- `item_id` (str): 条目ID

**返回值**：
- `bool`: 删除是否成功

**效果**：删除指定分类下的指定条目

**位置**：`src/data_manager.py - DataManager.delete_custom_item`

---

## UI组件层 - 卡片组件 card.py

**文件位置**：`src/widgets/card.py`

**所属模块**：UI组件层

### 类：CardWidget

#### 1. __init__

```python
def __init__(self, title: str = "", content: str = "", **kwargs)
```

**功能说明**：初始化卡片组件

**参数**：
- `title` (str): 卡片标题
- `content` (str): 卡片内容
- `**kwargs`: 传递给父类的参数

**返回值**：
- 无

**效果**：创建一个带标题和内容的卡片组件

**位置**：`src/widgets/card.py - CardWidget.__init__`

---

#### 2. _update_rect

```python
def _update_rect(self, *args)
```

**功能说明**：更新矩形位置和大小

**参数**：
- `*args`: 事件参数

**返回值**：
- 无

**效果**：当卡片位置或大小变化时，更新背景矩形

**位置**：`src/widgets/card.py - CardWidget._update_rect`

---

#### 3. add_button

```python
def add_button(self, text: str, callback) -> Button
```

**功能说明**：添加操作按钮

**参数**：
- `text` (str): 按钮文字
- `callback` (function): 点击回调函数

**返回值**：
- `Button`: 创建的按钮对象

**效果**：向卡片底部添加操作按钮

**位置**：`src/widgets/card.py - CardWidget.add_button`

---

#### 4. set_title

```python
def set_title(self, title: str)
```

**功能说明**：设置卡片标题

**参数**：
- `title` (str): 标题文字

**返回值**：
- 无

**效果**：更新卡片的标题

**位置**：`src/widgets/card.py - CardWidget.set_title`

---

#### 5. set_content

```python
def set_content(self, content: str)
```

**功能说明**：设置卡片内容

**参数**：
- `content` (str): 内容文字

**返回值**：
- 无

**效果**：更新卡片的内容

**位置**：`src/widgets/card.py - CardWidget.set_content`

---

## UI组件层 - 弹窗组件 modal.py

**文件位置**：`src/widgets/modal.py`

**所属模块**：UI组件层

### 类：ModalWidget

#### 1. __init__

```python
def __init__(self, title: str = "弹窗", **kwargs)
```

**功能说明**：初始化弹窗组件

**参数**：
- `title` (str): 弹窗标题
- `**kwargs`: 传递给父类的参数

**返回值**：
- 无

**效果**：创建一个带标题的弹窗组件

**位置**：`src/widgets/modal.py - ModalWidget.__init__`

---

#### 2. _update_rect

```python
def _update_rect(self, *args)
```

**功能说明**：更新矩形位置

**参数**：
- `*args`: 事件参数

**返回值**：
- 无

**效果**：当弹窗位置或大小变化时，更新背景

**位置**：`src/widgets/modal.py - ModalWidget._update_rect`

---

#### 3. add_widget_to_content

```python
def add_widget_to_content(self, widget)
```

**功能说明**：添加内容组件

**参数**：
- `widget`: 要添加的组件

**返回值**：
- 无

**效果**：向弹窗内容区域添加组件

**位置**：`src/widgets/modal.py - ModalWidget.add_widget_to_content`

---

#### 4. add_button

```python
def add_button(self, text: str, callback, is_primary: bool = False) -> Button
```

**功能说明**：添加按钮

**参数**：
- `text` (str): 按钮文字
- `callback` (function): 点击回调函数
- `is_primary` (bool): 是否是主要按钮

**返回值**：
- `Button`: 创建的按钮对象

**效果**：向弹窗底部添加按钮

**位置**：`src/widgets/modal.py - ModalWidget.add_button`

---

#### 5. add_input_field

```python
def add_input_field(self, label: str, initial_value: str = "", multiline: bool = False) -> TextInput
```

**功能说明**：添加输入字段

**参数**：
- `label` (str): 字段标签
- `initial_value` (str): 初始值
- `multiline` (bool): 是否多行

**返回值**：
- `TextInput`: 创建的输入框对象

**效果**：向弹窗添加带标签的输入字段

**位置**：`src/widgets/modal.py - ModalWidget.add_input_field`

---

#### 6. open

```python
def open(self)
```

**功能说明**：打开弹窗

**参数**：
- 无

**返回值**：
- 无

**效果**：显示弹窗

**位置**：`src/widgets/modal.py - ModalWidget.open`

---

#### 7. close

```python
def close(self)
```

**功能说明**：关闭弹窗

**参数**：
- 无

**返回值**：
- 无

**效果**：隐藏并移除弹窗

**位置**：`src/widgets/modal.py - ModalWidget.close`

---

### 类：ConfirmModal

#### 8. __init__

```python
def __init__(self, title: str, message: str, on_confirm, on_cancel=None, **kwargs)
```

**功能说明**：初始化确认弹窗

**参数**：
- `title` (str): 弹窗标题
- `message` (str): 确认消息
- `on_confirm` (function): 确认回调
- `on_cancel` (function): 取消回调
- `**kwargs`: 传递给父类的参数

**返回值**：
- 无

**效果**：创建一个带确认和取消按钮的确认弹窗

**位置**：`src/widgets/modal.py - ConfirmModal.__init__`

---

## UI组件层 - Toast组件 toast.py

**文件位置**：`src/widgets/toast.py`

**所属模块**：UI组件层

### 类：ToastWidget

#### 1. __init__

```python
def __init__(self, message: str, duration: float = 2.0, **kwargs)
```

**功能说明**：初始化Toast组件

**参数**：
- `message` (str): 提示消息
- `duration` (float): 显示时长（秒）
- `**kwargs`: 传递给父类的参数

**返回值**：
- 无

**效果**：创建一个Toast提示组件

**位置**：`src/widgets/toast.py - ToastWidget.__init__`

---

#### 2. _update_rect

```python
def _update_rect(self, *args)
```

**功能说明**：更新矩形位置和大小

**参数**：
- `*args`: 事件参数

**返回值**：
- 无

**效果**：当Toast位置或大小变化时，更新背景

**位置**：`src/widgets/toast.py - ToastWidget._update_rect`

---

#### 3. _on_complete

```python
def _on_complete(self, *args)
```

**功能说明**：动画完成回调

**参数**：
- `*args`: 事件参数

**返回值**：
- 无

**效果**：Toast显示结束后自动移除

**位置**：`src/widgets/toast.py - ToastWidget._on_complete`

---

### 函数：show_toast

#### 4. show_toast

```python
def show_toast(parent, message: str, duration: float = 2.0) -> ToastWidget
```

**功能说明**：显示Toast提示

**参数**：
- `parent`: 父组件
- `message` (str): 提示消息
- `duration` (float): 显示时长（秒）

**返回值**：
- `ToastWidget`: 创建的Toast组件

**效果**：在父组件中显示Toast提示

**位置**：`src/widgets/toast.py - show_toast`

---

## UI层 - 基础屏幕 base_screen.py

**文件位置**：`src/screens/base_screen.py`

**所属模块**：UI层

### 类：BaseScreen

#### 1. __init__

```python
def __init__(self, data_manager, screen_name: str = "", **kwargs)
```

**功能说明**：初始化基础屏幕

**参数**：
- `data_manager`: 数据管理器实例
- `screen_name` (str): 屏幕名称
- `**kwargs`: 传递给父类的参数

**返回值**：
- 无

**效果**：创建屏幕的基本结构，包括标题栏、内容区域等

**位置**：`src/screens/base_screen.py - BaseScreen.__init__`

---

#### 2. _update_title_bg

```python
def _update_title_bg(self, *args)
```

**功能说明**：更新标题栏背景

**参数**：
- `*args`: 事件参数

**返回值**：
- 无

**效果**：当标题栏位置或大小变化时，更新背景

**位置**：`src/screens/base_screen.py - BaseScreen._update_title_bg`

---

#### 3. _on_data_changed

```python
def _on_data_changed(self, event_type: str)
```

**功能说明**：数据变更回调

**参数**：
- `event_type` (str): 事件类型

**返回值**：
- 无

**效果**：当数据发生变更时被调用，子类可以重写此方法

**位置**：`src/screens/base_screen.py - BaseScreen._on_data_changed`

---

#### 4. refresh

```python
def refresh(self)
```

**功能说明**：刷新界面

**参数**：
- 无

**返回值**：
- 无

**效果**：重新加载数据并刷新界面显示

**位置**：`src/screens/base_screen.py - BaseScreen.refresh`

---

#### 5. _clear_content

```python
def _clear_content(self)
```

**功能说明**：清空内容区域

**参数**：
- 无

**返回值**：
- 无

**效果**：清空内容区域的所有组件

**位置**：`src/screens/base_screen.py - BaseScreen._clear_content`

---

#### 6. _build_content

```python
def _build_content(self)
```

**功能说明**：构建内容

**参数**：
- 无

**返回值**：
- 无

**效果**：构建界面内容，子类需要重写此方法

**位置**：`src/screens/base_screen.py - BaseScreen._build_content`

---

#### 7. add_toolbar_button

```python
def add_toolbar_button(self, text: str, callback) -> Button
```

**功能说明**：添加工具栏按钮

**参数**：
- `text` (str): 按钮文字
- `callback` (function): 点击回调函数

**返回值**：
- `Button`: 创建的按钮对象

**效果**：向工具栏添加操作按钮

**位置**：`src/screens/base_screen.py - BaseScreen.add_toolbar_button`

---

#### 8. add_search_bar

```python
def add_search_bar(self, callback) -> TextInput
```

**功能说明**：添加搜索栏

**参数**：
- `callback` (function): 搜索回调函数

**返回值**：
- `TextInput`: 创建的搜索输入框对象

**效果**：向工具栏添加搜索输入框

**位置**：`src/screens/base_screen.py - BaseScreen.add_search_bar`

---

#### 9. show_toast

```python
def show_toast(self, message: str, duration: float = 2.0)
```

**功能说明**：显示Toast提示

**参数**：
- `message` (str): 提示消息
- `duration` (float): 显示时长（秒）

**返回值**：
- 无

**效果**：在当前屏幕显示Toast提示消息

**位置**：`src/screens/base_screen.py - BaseScreen.show_toast`

---

#### 10. add_section_title

```python
def add_section_title(self, title: str) -> Label
```

**功能说明**：添加分区标题

**参数**：
- `title` (str): 标题文字

**返回值**：
- `Label`: 创建的标题标签对象

**效果**：向内容区域添加分区标题

**位置**：`src/screens/base_screen.py - BaseScreen.add_section_title`

---

#### 11. add_empty_hint

```python
def add_empty_hint(self, hint: str = "暂无数据") -> Label
```

**功能说明**：添加空数据提示

**参数**：
- `hint` (str): 提示文字

**返回值**：
- `Label`: 创建的提示标签对象

**效果**：当没有数据时显示提示信息

**位置**：`src/screens/base_screen.py - BaseScreen.add_empty_hint`

---

## UI层 - 角色屏幕 character_screen.py

**文件位置**：`src/screens/character_screen.py`

**所属模块**：角色模块

### 类：CharacterScreen

#### 1. __init__

```python
def __init__(self, data_manager, **kwargs)
```

**功能说明**：初始化角色屏幕

**参数**：
- `data_manager`: 数据管理器实例
- `**kwargs`: 传递给父类的参数

**返回值**：
- 无

**效果**：创建角色屏幕，设置标题和工具栏

**位置**：`src/screens/character_screen.py - CharacterScreen.__init__`

---

#### 2. _build_content

```python
def _build_content(self)
```

**功能说明**：构建角色界面内容

**参数**：
- 无

**返回值**：
- 无

**效果**：加载角色数据并构建界面

**位置**：`src/screens/character_screen.py - CharacterScreen._build_content`

---

#### 3. _on_data_changed

```python
def _on_data_changed(self, event_type: str)
```

**功能说明**：数据变更回调

**参数**：
- `event_type` (str): 事件类型

**返回值**：
- 无

**效果**：当角色数据变更时刷新界面

**位置**：`src/screens/character_screen.py - CharacterScreen._on_data_changed`

---

#### 4. _show_edit_modal

```python
def _show_edit_modal(self, instance)
```

**功能说明**：显示编辑角色弹窗

**参数**：
- `instance`: 按钮实例

**返回值**：
- 无

**效果**：打开编辑角色信息的弹窗

**位置**：`src/screens/character_screen.py - CharacterScreen._show_edit_modal`

---

## UI层 - 货币屏幕 currency_screen.py

**文件位置**：`src/screens/currency_screen.py`

**所属模块**：货币模块

### 类：CurrencyScreen

#### 1. __init__

```python
def __init__(self, data_manager, **kwargs)
```

**功能说明**：初始化货币屏幕

**参数**：
- `data_manager`: 数据管理器实例
- `**kwargs`: 传递给父类的参数

**返回值**：
- 无

**效果**：创建货币屏幕，设置标题和工具栏

**位置**：`src/screens/currency_screen.py - CurrencyScreen.__init__`

---

#### 2. _build_content

```python
def _build_content(self)
```

**功能说明**：构建货币界面内容

**参数**：
- 无

**返回值**：
- 无

**效果**：加载货币数据并构建界面

**位置**：`src/screens/currency_screen.py - CurrencyScreen._build_content`

---

#### 3. _on_data_changed

```python
def _on_data_changed(self, event_type: str)
```

**功能说明**：数据变更回调

**参数**：
- `event_type` (str): 事件类型

**返回值**：
- 无

**效果**：当货币数据变更时刷新界面

**位置**：`src/screens/currency_screen.py - CurrencyScreen._on_data_changed`

---

#### 4. _show_add_type_modal

```python
def _show_add_type_modal(self, instance)
```

**功能说明**：显示添加货币类型弹窗

**参数**：
- `instance`: 按钮实例

**返回值**：
- 无

**效果**：打开添加新货币类型的弹窗

**位置**：`src/screens/currency_screen.py - CurrencyScreen._show_add_type_modal`

---

#### 5. _show_add_modal

```python
def _show_add_modal(self, currency_type: str)
```

**功能说明**：显示增加货币弹窗

**参数**：
- `currency_type` (str): 货币类型ID

**返回值**：
- 无

**效果**：打开增加指定货币数量的弹窗

**位置**：`src/screens/currency_screen.py - CurrencyScreen._show_add_modal`

---

#### 6. _show_subtract_modal

```python
def _show_subtract_modal(self, currency_type: str)
```

**功能说明**：显示减少货币弹窗

**参数**：
- `currency_type` (str): 货币类型ID

**返回值**：
- 无

**效果**：打开减少指定货币数量的弹窗

**位置**：`src/screens/currency_screen.py - CurrencyScreen._show_subtract_modal`

---

#### 7. _show_delete_confirm

```python
def _show_delete_confirm(self, currency_type: str)
```

**功能说明**：显示删除确认弹窗

**参数**：
- `currency_type` (str): 货币类型ID

**返回值**：
- 无

**效果**：打开删除货币类型的确认弹窗

**位置**：`src/screens/currency_screen.py - CurrencyScreen._show_delete_confirm`

---

## UI层 - 背包屏幕 inventory_screen.py

**文件位置**：`src/screens/inventory_screen.py`

**所属模块**：背包模块

### 类：InventoryScreen

#### 1. __init__

```python
def __init__(self, data_manager, **kwargs)
```

**功能说明**：初始化背包屏幕

**参数**：
- `data_manager`: 数据管理器实例
- `**kwargs`: 传递给父类的参数

**返回值**：
- 无

**效果**：创建背包屏幕，设置标题和工具栏

**位置**：`src/screens/inventory_screen.py - InventoryScreen.__init__`

---

#### 2. _build_content

```python
def _build_content(self)
```

**功能说明**：构建背包界面内容

**参数**：
- 无

**返回值**：
- 无

**效果**：加载背包数据并构建界面

**位置**：`src/screens/inventory_screen.py - InventoryScreen._build_content`

---

#### 3. _on_data_changed

```python
def _on_data_changed(self, event_type: str)
```

**功能说明**：数据变更回调

**参数**：
- `event_type` (str): 事件类型

**返回值**：
- 无

**效果**：当背包数据变更时刷新界面

**位置**：`src/screens/inventory_screen.py - InventoryScreen._on_data_changed`

---

#### 4. _show_add_modal

```python
def _show_add_modal(self, instance)
```

**功能说明**：显示添加物品弹窗

**参数**：
- `instance`: 按钮实例

**返回值**：
- 无

**效果**：打开添加新物品的弹窗

**位置**：`src/screens/inventory_screen.py - InventoryScreen._show_add_modal`

---

#### 5. _show_edit_modal

```python
def _show_edit_modal(self, item_id: str)
```

**功能说明**：显示编辑物品弹窗

**参数**：
- `item_id` (str): 物品ID

**返回值**：
- 无

**效果**：打开编辑物品的弹窗

**位置**：`src/screens/inventory_screen.py - InventoryScreen._show_edit_modal`

---

#### 6. _show_delete_confirm

```python
def _show_delete_confirm(self, item_id: str)
```

**功能说明**：显示删除确认弹窗

**参数**：
- `item_id` (str): 物品ID

**返回值**：
- 无

**效果**：打开删除物品的确认弹窗

**位置**：`src/screens/inventory_screen.py - InventoryScreen._show_delete_confirm`

---

## UI层 - 装备屏幕 equipment_screen.py

**文件位置**：`src/screens/equipment_screen.py`

**所属模块**：装备模块

### 类：EquipmentScreen

#### 1. __init__

```python
def __init__(self, data_manager, **kwargs)
```

**功能说明**：初始化装备屏幕

**参数**：
- `data_manager`: 数据管理器实例
- `**kwargs`: 传递给父类的参数

**返回值**：
- 无

**效果**：创建装备屏幕，设置标题和工具栏

**位置**：`src/screens/equipment_screen.py - EquipmentScreen.__init__`

---

#### 2. _build_content

```python
def _build_content(self)
```

**功能说明**：构建装备界面内容

**参数**：
- 无

**返回值**：
- 无

**效果**：加载装备数据并构建界面

**位置**：`src/screens/equipment_screen.py - EquipmentScreen._build_content`

---

#### 3. _on_data_changed

```python
def _on_data_changed(self, event_type: str)
```

**功能说明**：数据变更回调

**参数**：
- `event_type` (str): 事件类型

**返回值**：
- 无

**效果**：当装备数据变更时刷新界面

**位置**：`src/screens/equipment_screen.py - EquipmentScreen._on_data_changed`

---

#### 4. _show_add_slot_modal

```python
def _show_add_slot_modal(self, instance)
```

**功能说明**：显示添加装备槽位弹窗

**参数**：
- `instance`: 按钮实例

**返回值**：
- 无

**效果**：打开添加新装备槽位的弹窗

**位置**：`src/screens/equipment_screen.py - EquipmentScreen._show_add_slot_modal`

---

#### 5. _show_equip_modal

```python
def _show_equip_modal(self, slot_id: str)
```

**功能说明**：显示装备物品弹窗

**参数**：
- `slot_id` (str): 槽位ID

**返回值**：
- 无

**效果**：打开选择物品装备的弹窗

**位置**：`src/screens/equipment_screen.py - EquipmentScreen._show_equip_modal`

---

#### 6. _unequip_item

```python
def _unequip_item(self, slot_id: str)
```

**功能说明**：卸下装备

**参数**：
- `slot_id` (str): 槽位ID

**返回值**：
- 无

**效果**：卸下指定槽位上的装备

**位置**：`src/screens/equipment_screen.py - EquipmentScreen._unequip_item`

---

#### 7. _show_delete_slot_confirm

```python
def _show_delete_slot_confirm(self, slot_id: str)
```

**功能说明**：显示删除槽位确认弹窗

**参数**：
- `slot_id` (str): 槽位ID

**返回值**：
- 无

**效果**：打开删除装备槽位的确认弹窗

**位置**：`src/screens/equipment_screen.py - EquipmentScreen._show_delete_slot_confirm`

---

## UI层 - 任务屏幕 quest_screen.py

**文件位置**：`src/screens/quest_screen.py`

**所属模块**：任务模块

### 类：QuestScreen

#### 1. __init__

```python
def __init__(self, data_manager, **kwargs)
```

**功能说明**：初始化任务屏幕

**参数**：
- `data_manager`: 数据管理器实例
- `**kwargs`: 传递给父类的参数

**返回值**：
- 无

**效果**：创建任务屏幕，设置标题和工具栏

**位置**：`src/screens/quest_screen.py - QuestScreen.__init__`

---

#### 2. _build_content

```python
def _build_content(self)
```

**功能说明**：构建任务界面内容

**参数**：
- 无

**返回值**：
- 无

**效果**：加载任务数据并构建界面

**位置**：`src/screens/quest_screen.py - QuestScreen._build_content`

---

#### 3. _on_data_changed

```python
def _on_data_changed(self, event_type: str)
```

**功能说明**：数据变更回调

**参数**：
- `event_type` (str): 事件类型

**返回值**：
- 无

**效果**：当任务数据变更时刷新界面

**位置**：`src/screens/quest_screen.py - QuestScreen._on_data_changed`

---

#### 4. _show_add_modal

```python
def _show_add_modal(self, instance)
```

**功能说明**：显示添加任务弹窗

**参数**：
- `instance`: 按钮实例

**返回值**：
- 无

**效果**：打开添加新任务的弹窗

**位置**：`src/screens/quest_screen.py - QuestScreen._show_add_modal`

---

#### 5. _show_edit_modal

```python
def _show_edit_modal(self, quest_id: str)
```

**功能说明**：显示编辑任务弹窗

**参数**：
- `quest_id` (str): 任务ID

**返回值**：
- 无

**效果**：打开编辑任务的弹窗

**位置**：`src/screens/quest_screen.py - QuestScreen._show_edit_modal`

---

#### 6. _complete_quest

```python
def _complete_quest(self, quest_id: str)
```

**功能说明**：完成任务

**参数**：
- `quest_id` (str): 任务ID

**返回值**：
- 无

**效果**：将任务标记为已完成

**位置**：`src/screens/quest_screen.py - QuestScreen._complete_quest`

---

#### 7. _show_delete_confirm

```python
def _show_delete_confirm(self, quest_id: str)
```

**功能说明**：显示删除确认弹窗

**参数**：
- `quest_id` (str): 任务ID

**返回值**：
- 无

**效果**：打开删除任务的确认弹窗

**位置**：`src/screens/quest_screen.py - QuestScreen._show_delete_confirm`

---

## UI层 - 技能屏幕 skill_screen.py

**文件位置**：`src/screens/skill_screen.py`

**所属模块**：技能模块

### 类：SkillScreen

#### 1. __init__

```python
def __init__(self, data_manager, **kwargs)
```

**功能说明**：初始化技能屏幕

**参数**：
- `data_manager`: 数据管理器实例
- `**kwargs`: 传递给父类的参数

**返回值**：
- 无

**效果**：创建技能屏幕，设置标题和工具栏

**位置**：`src/screens/skill_screen.py - SkillScreen.__init__`

---

#### 2. _build_content

```python
def _build_content(self)
```

**功能说明**：构建技能界面内容

**参数**：
- 无

**返回值**：
- 无

**效果**：加载技能数据并构建界面

**位置**：`src/screens/skill_screen.py - SkillScreen._build_content`

---

#### 3. _on_data_changed

```python
def _on_data_changed(self, event_type: str)
```

**功能说明**：数据变更回调

**参数**：
- `event_type` (str): 事件类型

**返回值**：
- 无

**效果**：当技能数据变更时刷新界面

**位置**：`src/screens/skill_screen.py - SkillScreen._on_data_changed`

---

#### 4. _show_add_modal

```python
def _show_add_modal(self, instance)
```

**功能说明**：显示添加技能弹窗

**参数**：
- `instance`: 按钮实例

**返回值**：
- 无

**效果**：打开添加新技能的弹窗

**位置**：`src/screens/skill_screen.py - SkillScreen._show_add_modal`

---

#### 5. _show_edit_modal

```python
def _show_edit_modal(self, skill_id: str)
```

**功能说明**：显示编辑技能弹窗

**参数**：
- `skill_id` (str): 技能ID

**返回值**：
- 无

**效果**：打开编辑技能的弹窗

**位置**：`src/screens/skill_screen.py - SkillScreen._show_edit_modal`

---

#### 6. _upgrade_skill

```python
def _upgrade_skill(self, skill_id: str)
```

**功能说明**：升级技能

**参数**：
- `skill_id` (str): 技能ID

**返回值**：
- 无

**效果**：将技能等级提升1级

**位置**：`src/screens/skill_screen.py - SkillScreen._upgrade_skill`

---

#### 7. _show_delete_confirm

```python
def _show_delete_confirm(self, skill_id: str)
```

**功能说明**：显示删除确认弹窗

**参数**：
- `skill_id` (str): 技能ID

**返回值**：
- 无

**效果**：打开删除技能的确认弹窗

**位置**：`src/screens/skill_screen.py - SkillScreen._show_delete_confirm`

---

## UI层 - 剧情标记屏幕 story_screen.py

**文件位置**：`src/screens/story_screen.py`

**所属模块**：剧情标记模块

### 类：StoryScreen

#### 1. __init__

```python
def __init__(self, data_manager, **kwargs)
```

**功能说明**：初始化剧情标记屏幕

**参数**：
- `data_manager`: 数据管理器实例
- `**kwargs`: 传递给父类的参数

**返回值**：
- 无

**效果**：创建剧情标记屏幕，设置标题和工具栏

**位置**：`src/screens/story_screen.py - StoryScreen.__init__`

---

#### 2. _build_content

```python
def _build_content(self)
```

**功能说明**：构建剧情标记界面内容

**参数**：
- 无

**返回值**：
- 无

**效果**：加载剧情标记数据并构建界面

**位置**：`src/screens/story_screen.py - StoryScreen._build_content`

---

#### 3. _on_data_changed

```python
def _on_data_changed(self, event_type: str)
```

**功能说明**：数据变更回调

**参数**：
- `event_type` (str): 事件类型

**返回值**：
- 无

**效果**：当剧情标记数据变更时刷新界面

**位置**：`src/screens/story_screen.py - StoryScreen._on_data_changed`

---

#### 4. _show_add_modal

```python
def _show_add_modal(self, instance)
```

**功能说明**：显示添加剧情标记弹窗

**参数**：
- `instance`: 按钮实例

**返回值**：
- 无

**效果**：打开添加新剧情标记的弹窗

**位置**：`src/screens/story_screen.py - StoryScreen._show_add_modal`

---

#### 5. _show_edit_modal

```python
def _show_edit_modal(self, mark_id: str)
```

**功能说明**：显示编辑剧情标记弹窗

**参数**：
- `mark_id` (str): 标记ID

**返回值**：
- 无

**效果**：打开编辑剧情标记的弹窗

**位置**：`src/screens/story_screen.py - StoryScreen._show_edit_modal`

---

#### 6. _show_delete_confirm

```python
def _show_delete_confirm(self, mark_id: str)
```

**功能说明**：显示删除确认弹窗

**参数**：
- `mark_id` (str): 标记ID

**返回值**：
- 无

**效果**：打开删除剧情标记的确认弹窗

**位置**：`src/screens/story_screen.py - StoryScreen._show_delete_confirm`

---

## UI层 - 伏笔屏幕 foreshadowing_screen.py

**文件位置**：`src/screens/foreshadowing_screen.py`

**所属模块**：伏笔模块

### 类：ForeshadowingScreen

#### 1. __init__

```python
def __init__(self, data_manager, **kwargs)
```

**功能说明**：初始化伏笔屏幕

**参数**：
- `data_manager`: 数据管理器实例
- `**kwargs`: 传递给父类的参数

**返回值**：
- 无

**效果**：创建伏笔屏幕，设置标题和工具栏

**位置**：`src/screens/foreshadowing_screen.py - ForeshadowingScreen.__init__`

---

#### 2. _build_content

```python
def _build_content(self)
```

**功能说明**：构建伏笔界面内容

**参数**：
- 无

**返回值**：
- 无

**效果**：加载伏笔数据并构建界面

**位置**：`src/screens/foreshadowing_screen.py - ForeshadowingScreen._build_content`

---

#### 3. _on_data_changed

```python
def _on_data_changed(self, event_type: str)
```

**功能说明**：数据变更回调

**参数**：
- `event_type` (str): 事件类型

**返回值**：
- 无

**效果**：当伏笔数据变更时刷新界面

**位置**：`src/screens/foreshadowing_screen.py - ForeshadowingScreen._on_data_changed`

---

#### 4. _show_add_modal

```python
def _show_add_modal(self, instance)
```

**功能说明**：显示添加伏笔弹窗

**参数**：
- `instance`: 按钮实例

**返回值**：
- 无

**效果**：打开添加新伏笔的弹窗

**位置**：`src/screens/foreshadowing_screen.py - ForeshadowingScreen._show_add_modal`

---

#### 5. _show_edit_modal

```python
def _show_edit_modal(self, foreshadowing_id: str)
```

**功能说明**：显示编辑伏笔弹窗

**参数**：
- `foreshadowing_id` (str): 伏笔ID

**返回值**：
- 无

**效果**：打开编辑伏笔的弹窗

**位置**：`src/screens/foreshadowing_screen.py - ForeshadowingScreen._show_edit_modal`

---

#### 6. _resolve_foreshadowing

```python
def _resolve_foreshadowing(self, foreshadowing_id: str)
```

**功能说明**：回收伏笔

**参数**：
- `foreshadowing_id` (str): 伏笔ID

**返回值**：
- 无

**效果**：将伏笔标记为已回收

**位置**：`src/screens/foreshadowing_screen.py - ForeshadowingScreen._resolve_foreshadowing`

---

#### 7. _show_delete_confirm

```python
def _show_delete_confirm(self, foreshadowing_id: str)
```

**功能说明**：显示删除确认弹窗

**参数**：
- `foreshadowing_id` (str): 伏笔ID

**返回值**：
- 无

**效果**：打开删除伏笔的确认弹窗

**位置**：`src/screens/foreshadowing_screen.py - ForeshadowingScreen._show_delete_confirm`

---

## UI层 - 自定义数据屏幕 custom_screen.py

**文件位置**：`src/screens/custom_screen.py`

**所属模块**：自定义数据模块

### 类：CustomScreen

#### 1. __init__

```python
def __init__(self, data_manager, **kwargs)
```

**功能说明**：初始化自定义数据屏幕

**参数**：
- `data_manager`: 数据管理器实例
- `**kwargs`: 传递给父类的参数

**返回值**：
- 无

**效果**：创建自定义数据屏幕，设置标题和工具栏

**位置**：`src/screens/custom_screen.py - CustomScreen.__init__`

---

#### 2. _build_content

```python
def _build_content(self)
```

**功能说明**：构建自定义数据界面内容

**参数**：
- 无

**返回值**：
- 无

**效果**：加载自定义数据并构建界面

**位置**：`src/screens/custom_screen.py - CustomScreen._build_content`

---

#### 3. _on_data_changed

```python
def _on_data_changed(self, event_type: str)
```

**功能说明**：数据变更回调

**参数**：
- `event_type` (str): 事件类型

**返回值**：
- 无

**效果**：当自定义数据变更时刷新界面

**位置**：`src/screens/custom_screen.py - CustomScreen._on_data_changed`

---

#### 4. _show_add_category_modal

```python
def _show_add_category_modal(self, instance)
```

**功能说明**：显示添加分类弹窗

**参数**：
- `instance`: 按钮实例

**返回值**：
- 无

**效果**：打开添加新自定义分类的弹窗

**位置**：`src/screens/custom_screen.py - CustomScreen._show_add_category_modal`

---

#### 5. _show_items_modal

```python
def _show_items_modal(self, category_id: str)
```

**功能说明**：显示分类条目弹窗

**参数**：
- `category_id` (str): 分类ID

**返回值**：
- 无

**效果**：打开显示分类条目的弹窗

**位置**：`src/screens/custom_screen.py - CustomScreen._show_items_modal`

---

#### 6. _show_add_item_modal

```python
def _show_add_item_modal(self, category_id: str)
```

**功能说明**：显示添加条目弹窗

**参数**：
- `category_id` (str): 分类ID

**返回值**：
- 无

**效果**：打开添加新条目的弹窗

**位置**：`src/screens/custom_screen.py - CustomScreen._show_add_item_modal`

---

#### 7. _show_delete_category_confirm

```python
def _show_delete_category_confirm(self, category_id: str)
```

**功能说明**：显示删除分类确认弹窗

**参数**：
- `category_id` (str): 分类ID

**返回值**：
- 无

**效果**：打开删除自定义分类的确认弹窗

**位置**：`src/screens/custom_screen.py - CustomScreen._show_delete_category_confirm`

---

## UI层 - 数据预览屏幕 preview_screen.py

**文件位置**：`src/screens/preview_screen.py`

**所属模块**：数据预览模块

### 类：PreviewScreen

#### 1. __init__

```python
def __init__(self, data_manager, **kwargs)
```

**功能说明**：初始化数据预览屏幕

**参数**：
- `data_manager`: 数据管理器实例
- `**kwargs`: 传递给父类的参数

**返回值**：
- 无

**效果**：创建数据预览屏幕，设置标题

**位置**：`src/screens/preview_screen.py - PreviewScreen.__init__`

---

#### 2. _build_content

```python
def _build_content(self)
```

**功能说明**：构建数据预览界面内容

**参数**：
- 无

**返回值**：
- 无

**效果**：加载所有数据并构建概览界面

**位置**：`src/screens/preview_screen.py - PreviewScreen._build_content`

---

#### 3. _on_data_changed

```python
def _on_data_changed(self, event_type: str)
```

**功能说明**：数据变更回调

**参数**：
- `event_type` (str): 事件类型

**返回值**：
- 无

**效果**：当任何数据变更时刷新界面

**位置**：`src/screens/preview_screen.py - PreviewScreen._on_data_changed`

---

## 应用层 - app.py

**文件位置**：`src/app.py`

**所属模块**：应用层

### 类：NovelManagerApp

#### 1. __init__

```python
def __init__(self, **kwargs)
```

**功能说明**：初始化应用

**参数**：
- `**kwargs`: 传递给父类的参数

**返回值**：
- 无

**效果**：创建数据管理器，初始化应用

**位置**：`src/app.py - NovelManagerApp.__init__`

---

#### 2. build

```python
def build(self)
```

**功能说明**：构建应用界面

**参数**：
- 无

**返回值**：
- `BoxLayout`: 主布局

**效果**：创建主布局，包括屏幕管理器和底部导航栏

**位置**：`src/app.py - NovelManagerApp.build`

---

#### 3. _create_screens

```python
def _create_screens(self)
```

**功能说明**：创建所有功能屏幕

**参数**：
- 无

**返回值**：
- 无

**效果**：创建所有功能模块的屏幕并添加到屏幕管理器

**位置**：`src/app.py - NovelManagerApp._create_screens`

---

#### 4. _create_navigation

```python
def _create_navigation(self)
```

**功能说明**：创建底部导航栏

**参数**：
- 无

**返回值**：
- 无

**效果**：创建底部导航栏，包含各个功能模块的切换按钮

**位置**：`src/app.py - NovelManagerApp._create_navigation`

---

#### 5. _switch_screen

```python
def _switch_screen(self, screen_name: str)
```

**功能说明**：切换屏幕

**参数**：
- `screen_name` (str): 屏幕名称

**返回值**：
- 无

**效果**：切换到指定名称的屏幕

**位置**：`src/app.py - NovelManagerApp._switch_screen`

---

#### 6. on_stop

```python
def on_stop(self)
```

**功能说明**：应用停止时的回调

**参数**：
- 无

**返回值**：
- 无

**效果**：应用关闭时自动保存数据

**位置**：`src/app.py - NovelManagerApp.on_stop`

---

## 主程序入口 - main.py

**文件位置**：`main.py`

**所属模块**：应用层

### 函数：main

#### 1. main

```python
def main()
```

**功能说明**：主函数

**参数**：
- 无

**返回值**：
- 无

**效果**：创建并启动小说数据管理器应用

**位置**：`main.py - main`

---

## 文档结束

本文档列出了小说数据管理器 v3.0 中所有主要函数和类的说明。每个函数都包含了功能说明、参数、返回值、效果和位置信息，便于开发者理解和维护代码。

**版本**：v3.0
**更新日期**：2026-06-21
