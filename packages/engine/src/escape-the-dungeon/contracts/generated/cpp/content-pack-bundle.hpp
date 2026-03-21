//  To parse this JSON data, first install
//
//      Boost     http://www.boost.org
//      json.hpp  https://github.com/nlohmann/json
//
//  Then include this file, and then do
//
//     ContentPackBundle data = nlohmann::json::parse(jsonString);

#pragma once

#include <boost/optional.hpp>
#include <nlohmann/json.hpp>

#include <boost/optional.hpp>
#include <stdexcept>
#include <regex>

#ifndef NLOHMANN_OPT_HELPER
#define NLOHMANN_OPT_HELPER
namespace nlohmann {
    template <typename T>
    struct adl_serializer<std::shared_ptr<T>> {
        static void to_json(json & j, const std::shared_ptr<T> & opt) {
            if (!opt) j = nullptr; else j = *opt;
        }

        static std::shared_ptr<T> from_json(const json & j) {
            if (j.is_null()) return std::make_shared<T>(); else return std::make_shared<T>(j.get<T>());
        }
    };
    template <typename T>
    struct adl_serializer<boost::optional<T>> {
        static void to_json(json & j, const boost::optional<T> & opt) {
            if (!opt) j = nullptr; else j = *opt;
        }

        static boost::optional<T> from_json(const json & j) {
            if (j.is_null()) return boost::optional<T>(); else return boost::optional<T>(j.get<T>());
        }
    };
}
#endif

namespace DungeonBreakContracts {
    using nlohmann::json;

    #ifndef NLOHMANN_UNTYPED_DungeonBreakContracts_HELPER
    #define NLOHMANN_UNTYPED_DungeonBreakContracts_HELPER
    inline json get_untyped(const json & j, const char * property) {
        if (j.find(property) != j.end()) {
            return j.at(property).get<json>();
        }
        return json();
    }

    inline json get_untyped(const json & j, std::string property) {
        return get_untyped(j, property.data());
    }
    #endif

    #ifndef NLOHMANN_OPTIONAL_DungeonBreakContracts_HELPER
    #define NLOHMANN_OPTIONAL_DungeonBreakContracts_HELPER
    template <typename T>
    inline std::shared_ptr<T> get_heap_optional(const json & j, const char * property) {
        auto it = j.find(property);
        if (it != j.end() && !it->is_null()) {
            return j.at(property).get<std::shared_ptr<T>>();
        }
        return std::shared_ptr<T>();
    }

    template <typename T>
    inline std::shared_ptr<T> get_heap_optional(const json & j, std::string property) {
        return get_heap_optional<T>(j, property.data());
    }
    template <typename T>
    inline boost::optional<T> get_stack_optional(const json & j, const char * property) {
        auto it = j.find(property);
        if (it != j.end() && !it->is_null()) {
            return j.at(property).get<boost::optional<T>>();
        }
        return boost::optional<T>();
    }

    template <typename T>
    inline boost::optional<T> get_stack_optional(const json & j, std::string property) {
        return get_stack_optional<T>(j, property.data());
    }
    #endif

    class EnginePackage {
        public:
        EnginePackage() = default;
        virtual ~EnginePackage() = default;

        private:
        std::string name;
        std::string version;

        public:
        const std::string & get_name() const { return name; }
        std::string & get_mutable_name() { return name; }
        void set_name(const std::string & value) { this->name = value; }

        const std::string & get_version() const { return version; }
        std::string & get_mutable_version() { return version; }
        void set_version(const std::string & value) { this->version = value; }
    };

    class Hashes {
        public:
        Hashes() = default;
        virtual ~Hashes() = default;

        private:
        std::string action_catalog;
        std::string action_contracts;
        std::string action_intents;
        std::string action_policies;
        std::string archetype_pack;
        std::string content_schema;
        std::string content_source;
        std::string cutscene_pack;
        std::string dialogue_pack;
        std::string dungeon_layouts;
        std::string event_pack;
        std::string item_pack;
        std::string overall;
        std::string quest_pack;
        std::string room_templates;
        std::string skill_pack;
        std::string space_vectors;

        public:
        const std::string & get_action_catalog() const { return action_catalog; }
        std::string & get_mutable_action_catalog() { return action_catalog; }
        void set_action_catalog(const std::string & value) { this->action_catalog = value; }

        const std::string & get_action_contracts() const { return action_contracts; }
        std::string & get_mutable_action_contracts() { return action_contracts; }
        void set_action_contracts(const std::string & value) { this->action_contracts = value; }

        const std::string & get_action_intents() const { return action_intents; }
        std::string & get_mutable_action_intents() { return action_intents; }
        void set_action_intents(const std::string & value) { this->action_intents = value; }

        const std::string & get_action_policies() const { return action_policies; }
        std::string & get_mutable_action_policies() { return action_policies; }
        void set_action_policies(const std::string & value) { this->action_policies = value; }

        const std::string & get_archetype_pack() const { return archetype_pack; }
        std::string & get_mutable_archetype_pack() { return archetype_pack; }
        void set_archetype_pack(const std::string & value) { this->archetype_pack = value; }

        const std::string & get_content_schema() const { return content_schema; }
        std::string & get_mutable_content_schema() { return content_schema; }
        void set_content_schema(const std::string & value) { this->content_schema = value; }

        const std::string & get_content_source() const { return content_source; }
        std::string & get_mutable_content_source() { return content_source; }
        void set_content_source(const std::string & value) { this->content_source = value; }

        const std::string & get_cutscene_pack() const { return cutscene_pack; }
        std::string & get_mutable_cutscene_pack() { return cutscene_pack; }
        void set_cutscene_pack(const std::string & value) { this->cutscene_pack = value; }

        const std::string & get_dialogue_pack() const { return dialogue_pack; }
        std::string & get_mutable_dialogue_pack() { return dialogue_pack; }
        void set_dialogue_pack(const std::string & value) { this->dialogue_pack = value; }

        const std::string & get_dungeon_layouts() const { return dungeon_layouts; }
        std::string & get_mutable_dungeon_layouts() { return dungeon_layouts; }
        void set_dungeon_layouts(const std::string & value) { this->dungeon_layouts = value; }

        const std::string & get_event_pack() const { return event_pack; }
        std::string & get_mutable_event_pack() { return event_pack; }
        void set_event_pack(const std::string & value) { this->event_pack = value; }

        const std::string & get_item_pack() const { return item_pack; }
        std::string & get_mutable_item_pack() { return item_pack; }
        void set_item_pack(const std::string & value) { this->item_pack = value; }

        const std::string & get_overall() const { return overall; }
        std::string & get_mutable_overall() { return overall; }
        void set_overall(const std::string & value) { this->overall = value; }

        const std::string & get_quest_pack() const { return quest_pack; }
        std::string & get_mutable_quest_pack() { return quest_pack; }
        void set_quest_pack(const std::string & value) { this->quest_pack = value; }

        const std::string & get_room_templates() const { return room_templates; }
        std::string & get_mutable_room_templates() { return room_templates; }
        void set_room_templates(const std::string & value) { this->room_templates = value; }

        const std::string & get_skill_pack() const { return skill_pack; }
        std::string & get_mutable_skill_pack() { return skill_pack; }
        void set_skill_pack(const std::string & value) { this->skill_pack = value; }

        const std::string & get_space_vectors() const { return space_vectors; }
        std::string & get_mutable_space_vectors() { return space_vectors; }
        void set_space_vectors(const std::string & value) { this->space_vectors = value; }
    };

    class FeatureSchema {
        public:
        FeatureSchema() = default;
        virtual ~FeatureSchema() = default;

        private:
        int64_t default_value;
        std::string feature_id;
        std::vector<std::string> groups;
        std::string label;

        public:
        const int64_t & get_default_value() const { return default_value; }
        int64_t & get_mutable_default_value() { return default_value; }
        void set_default_value(const int64_t & value) { this->default_value = value; }

        const std::string & get_feature_id() const { return feature_id; }
        std::string & get_mutable_feature_id() { return feature_id; }
        void set_feature_id(const std::string & value) { this->feature_id = value; }

        const std::vector<std::string> & get_groups() const { return groups; }
        std::vector<std::string> & get_mutable_groups() { return groups; }
        void set_groups(const std::vector<std::string> & value) { this->groups = value; }

        const std::string & get_label() const { return label; }
        std::string & get_mutable_label() { return label; }
        void set_label(const std::string & value) { this->label = value; }
    };

    class FeatureRef {
        public:
        FeatureRef() = default;
        virtual ~FeatureRef() = default;

        private:
        std::string feature_id;
        boost::optional<bool> required;

        public:
        const std::string & get_feature_id() const { return feature_id; }
        std::string & get_mutable_feature_id() { return feature_id; }
        void set_feature_id(const std::string & value) { this->feature_id = value; }

        boost::optional<bool> get_required() const { return required; }
        void set_required(boost::optional<bool> value) { this->required = value; }
    };

    class ModelSchema {
        public:
        ModelSchema() = default;
        virtual ~ModelSchema() = default;

        private:
        std::string description;
        std::vector<FeatureRef> feature_refs;
        std::string label;
        std::string model_id;

        public:
        const std::string & get_description() const { return description; }
        std::string & get_mutable_description() { return description; }
        void set_description(const std::string & value) { this->description = value; }

        const std::vector<FeatureRef> & get_feature_refs() const { return feature_refs; }
        std::vector<FeatureRef> & get_mutable_feature_refs() { return feature_refs; }
        void set_feature_refs(const std::vector<FeatureRef> & value) { this->feature_refs = value; }

        const std::string & get_label() const { return label; }
        std::string & get_mutable_label() { return label; }
        void set_label(const std::string & value) { this->label = value; }

        const std::string & get_model_id() const { return model_id; }
        std::string & get_mutable_model_id() { return model_id; }
        void set_model_id(const std::string & value) { this->model_id = value; }
    };

    class StatDomain {
        public:
        StatDomain() = default;
        virtual ~StatDomain() = default;

        private:
        std::string entity_key_field;
        std::string generated_key_export;
        std::string lookup_id_field;
        std::string lookup_pack;

        public:
        const std::string & get_entity_key_field() const { return entity_key_field; }
        std::string & get_mutable_entity_key_field() { return entity_key_field; }
        void set_entity_key_field(const std::string & value) { this->entity_key_field = value; }

        const std::string & get_generated_key_export() const { return generated_key_export; }
        std::string & get_mutable_generated_key_export() { return generated_key_export; }
        void set_generated_key_export(const std::string & value) { this->generated_key_export = value; }

        const std::string & get_lookup_id_field() const { return lookup_id_field; }
        std::string & get_mutable_lookup_id_field() { return lookup_id_field; }
        void set_lookup_id_field(const std::string & value) { this->lookup_id_field = value; }

        const std::string & get_lookup_pack() const { return lookup_pack; }
        std::string & get_mutable_lookup_pack() { return lookup_pack; }
        void set_lookup_pack(const std::string & value) { this->lookup_pack = value; }
    };

    class StatSchema {
        public:
        StatSchema() = default;
        virtual ~StatSchema() = default;

        private:
        StatDomain combat;
        StatDomain narrative;
        StatDomain rune;
        StatDomain skill;

        public:
        const StatDomain & get_combat() const { return combat; }
        StatDomain & get_mutable_combat() { return combat; }
        void set_combat(const StatDomain & value) { this->combat = value; }

        const StatDomain & get_narrative() const { return narrative; }
        StatDomain & get_mutable_narrative() { return narrative; }
        void set_narrative(const StatDomain & value) { this->narrative = value; }

        const StatDomain & get_rune() const { return rune; }
        StatDomain & get_mutable_rune() { return rune; }
        void set_rune(const StatDomain & value) { this->rune = value; }

        const StatDomain & get_skill() const { return skill; }
        StatDomain & get_mutable_skill() { return skill; }
        void set_skill(const StatDomain & value) { this->skill = value; }
    };

    class ContentSchema {
        public:
        ContentSchema() = default;
        virtual ~ContentSchema() = default;

        private:
        std::string schema;
        std::vector<FeatureSchema> feature_schema;
        std::vector<ModelSchema> model_schemas;
        std::string schema_version;
        StatSchema stat_schema;

        public:
        const std::string & get_schema() const { return schema; }
        std::string & get_mutable_schema() { return schema; }
        void set_schema(const std::string & value) { this->schema = value; }

        const std::vector<FeatureSchema> & get_feature_schema() const { return feature_schema; }
        std::vector<FeatureSchema> & get_mutable_feature_schema() { return feature_schema; }
        void set_feature_schema(const std::vector<FeatureSchema> & value) { this->feature_schema = value; }

        const std::vector<ModelSchema> & get_model_schemas() const { return model_schemas; }
        std::vector<ModelSchema> & get_mutable_model_schemas() { return model_schemas; }
        void set_model_schemas(const std::vector<ModelSchema> & value) { this->model_schemas = value; }

        const std::string & get_schema_version() const { return schema_version; }
        std::string & get_mutable_schema_version() { return schema_version; }
        void set_schema_version(const std::string & value) { this->schema_version = value; }

        const StatSchema & get_stat_schema() const { return stat_schema; }
        StatSchema & get_mutable_stat_schema() { return stat_schema; }
        void set_stat_schema(const StatSchema & value) { this->stat_schema = value; }
    };

    class ChooseDialogue {
        public:
        ChooseDialogue() = default;
        virtual ~ChooseDialogue() = default;

        private:
        double exploration_intensity;
        double social_intensity;

        public:
        const double & get_exploration_intensity() const { return exploration_intensity; }
        double & get_mutable_exploration_intensity() { return exploration_intensity; }
        void set_exploration_intensity(const double & value) { this->exploration_intensity = value; }

        const double & get_social_intensity() const { return social_intensity; }
        double & get_mutable_social_intensity() { return social_intensity; }
        void set_social_intensity(const double & value) { this->social_intensity = value; }
    };

    class TrainClass {
        public:
        TrainClass() = default;
        virtual ~TrainClass() = default;

        private:
        boost::optional<double> combat_intensity;
        double crafting_intensity;
        double pressure;
        double risk;

        public:
        boost::optional<double> get_combat_intensity() const { return combat_intensity; }
        void set_combat_intensity(boost::optional<double> value) { this->combat_intensity = value; }

        const double & get_crafting_intensity() const { return crafting_intensity; }
        double & get_mutable_crafting_intensity() { return crafting_intensity; }
        void set_crafting_intensity(const double & value) { this->crafting_intensity = value; }

        const double & get_pressure() const { return pressure; }
        double & get_mutable_pressure() { return pressure; }
        void set_pressure(const double & value) { this->pressure = value; }

        const double & get_risk() const { return risk; }
        double & get_mutable_risk() { return risk; }
        void set_risk(const double & value) { this->risk = value; }
    };

    class EquipItem {
        public:
        EquipItem() = default;
        virtual ~EquipItem() = default;

        private:
        double crafting_intensity;
        double pressure;

        public:
        const double & get_crafting_intensity() const { return crafting_intensity; }
        double & get_mutable_crafting_intensity() { return crafting_intensity; }
        void set_crafting_intensity(const double & value) { this->crafting_intensity = value; }

        const double & get_pressure() const { return pressure; }
        double & get_mutable_pressure() { return pressure; }
        void set_pressure(const double & value) { this->pressure = value; }
    };

    class EvolveSkill {
        public:
        EvolveSkill() = default;
        virtual ~EvolveSkill() = default;

        private:
        double crafting_intensity;
        double pressure;
        double visibility;

        public:
        const double & get_crafting_intensity() const { return crafting_intensity; }
        double & get_mutable_crafting_intensity() { return crafting_intensity; }
        void set_crafting_intensity(const double & value) { this->crafting_intensity = value; }

        const double & get_pressure() const { return pressure; }
        double & get_mutable_pressure() { return pressure; }
        void set_pressure(const double & value) { this->pressure = value; }

        const double & get_visibility() const { return visibility; }
        double & get_mutable_visibility() { return visibility; }
        void set_visibility(const double & value) { this->visibility = value; }
    };

    class MurderClass {
        public:
        MurderClass() = default;
        virtual ~MurderClass() = default;

        private:
        double combat_intensity;
        double pressure;
        double risk;
        boost::optional<double> social_intensity;

        public:
        const double & get_combat_intensity() const { return combat_intensity; }
        double & get_mutable_combat_intensity() { return combat_intensity; }
        void set_combat_intensity(const double & value) { this->combat_intensity = value; }

        const double & get_pressure() const { return pressure; }
        double & get_mutable_pressure() { return pressure; }
        void set_pressure(const double & value) { this->pressure = value; }

        const double & get_risk() const { return risk; }
        double & get_mutable_risk() { return risk; }
        void set_risk(const double & value) { this->risk = value; }

        boost::optional<double> get_social_intensity() const { return social_intensity; }
        void set_social_intensity(boost::optional<double> value) { this->social_intensity = value; }
    };

    class EscapeGateClass {
        public:
        EscapeGateClass() = default;
        virtual ~EscapeGateClass() = default;

        private:
        double mobility;
        double pressure;
        double risk;

        public:
        const double & get_mobility() const { return mobility; }
        double & get_mutable_mobility() { return mobility; }
        void set_mobility(const double & value) { this->mobility = value; }

        const double & get_pressure() const { return pressure; }
        double & get_mutable_pressure() { return pressure; }
        void set_pressure(const double & value) { this->pressure = value; }

        const double & get_risk() const { return risk; }
        double & get_mutable_risk() { return risk; }
        void set_risk(const double & value) { this->risk = value; }
    };

    class LiveStreamClass {
        public:
        LiveStreamClass() = default;
        virtual ~LiveStreamClass() = default;

        private:
        boost::optional<double> pressure;
        boost::optional<double> risk;
        boost::optional<double> social_intensity;
        double visibility;

        public:
        boost::optional<double> get_pressure() const { return pressure; }
        void set_pressure(boost::optional<double> value) { this->pressure = value; }

        boost::optional<double> get_risk() const { return risk; }
        void set_risk(boost::optional<double> value) { this->risk = value; }

        boost::optional<double> get_social_intensity() const { return social_intensity; }
        void set_social_intensity(boost::optional<double> value) { this->social_intensity = value; }

        const double & get_visibility() const { return visibility; }
        double & get_mutable_visibility() { return visibility; }
        void set_visibility(const double & value) { this->visibility = value; }
    };

    class Move {
        public:
        Move() = default;
        virtual ~Move() = default;

        private:
        double exploration_intensity;
        double mobility;
        double risk;

        public:
        const double & get_exploration_intensity() const { return exploration_intensity; }
        double & get_mutable_exploration_intensity() { return exploration_intensity; }
        void set_exploration_intensity(const double & value) { this->exploration_intensity = value; }

        const double & get_mobility() const { return mobility; }
        double & get_mutable_mobility() { return mobility; }
        void set_mobility(const double & value) { this->mobility = value; }

        const double & get_risk() const { return risk; }
        double & get_mutable_risk() { return risk; }
        void set_risk(const double & value) { this->risk = value; }
    };

    class ActionSemanticsPurchase {
        public:
        ActionSemanticsPurchase() = default;
        virtual ~ActionSemanticsPurchase() = default;

        private:
        double crafting_intensity;
        double risk;
        double social_intensity;

        public:
        const double & get_crafting_intensity() const { return crafting_intensity; }
        double & get_mutable_crafting_intensity() { return crafting_intensity; }
        void set_crafting_intensity(const double & value) { this->crafting_intensity = value; }

        const double & get_risk() const { return risk; }
        double & get_mutable_risk() { return risk; }
        void set_risk(const double & value) { this->risk = value; }

        const double & get_social_intensity() const { return social_intensity; }
        double & get_mutable_social_intensity() { return social_intensity; }
        void set_social_intensity(const double & value) { this->social_intensity = value; }
    };

    class ActionSemanticsRest {
        public:
        ActionSemanticsRest() = default;
        virtual ~ActionSemanticsRest() = default;

        private:
        double pressure;
        double recovery_intensity;
        double risk;

        public:
        const double & get_pressure() const { return pressure; }
        double & get_mutable_pressure() { return pressure; }
        void set_pressure(const double & value) { this->pressure = value; }

        const double & get_recovery_intensity() const { return recovery_intensity; }
        double & get_mutable_recovery_intensity() { return recovery_intensity; }
        void set_recovery_intensity(const double & value) { this->recovery_intensity = value; }

        const double & get_risk() const { return risk; }
        double & get_mutable_risk() { return risk; }
        void set_risk(const double & value) { this->risk = value; }
    };

    class Search {
        public:
        Search() = default;
        virtual ~Search() = default;

        private:
        double exploration_intensity;
        double risk;
        double visibility;

        public:
        const double & get_exploration_intensity() const { return exploration_intensity; }
        double & get_mutable_exploration_intensity() { return exploration_intensity; }
        void set_exploration_intensity(const double & value) { this->exploration_intensity = value; }

        const double & get_risk() const { return risk; }
        double & get_mutable_risk() { return risk; }
        void set_risk(const double & value) { this->risk = value; }

        const double & get_visibility() const { return visibility; }
        double & get_mutable_visibility() { return visibility; }
        void set_visibility(const double & value) { this->visibility = value; }
    };

    class UseItemClass {
        public:
        UseItemClass() = default;
        virtual ~UseItemClass() = default;

        private:
        double crafting_intensity;
        double recovery_intensity;
        double risk;

        public:
        const double & get_crafting_intensity() const { return crafting_intensity; }
        double & get_mutable_crafting_intensity() { return crafting_intensity; }
        void set_crafting_intensity(const double & value) { this->crafting_intensity = value; }

        const double & get_recovery_intensity() const { return recovery_intensity; }
        double & get_mutable_recovery_intensity() { return recovery_intensity; }
        void set_recovery_intensity(const double & value) { this->recovery_intensity = value; }

        const double & get_risk() const { return risk; }
        double & get_mutable_risk() { return risk; }
        void set_risk(const double & value) { this->risk = value; }
    };

    class ActionSemantics {
        public:
        ActionSemantics() = default;
        virtual ~ActionSemantics() = default;

        private:
        ChooseDialogue choose_dialogue;
        TrainClass drop_item;
        EquipItem equip_item;
        EvolveSkill evolve_skill;
        MurderClass fight;
        EscapeGateClass flee;
        LiveStreamClass live_stream;
        Move move;
        MurderClass murder;
        ActionSemanticsPurchase purchase;
        EquipItem re_equip;
        LiveStreamClass recruit;
        ActionSemanticsRest rest;
        Search search;
        LiveStreamClass speak;
        Search steal;
        LiveStreamClass talk;
        TrainClass train;
        UseItemClass use_item;

        public:
        const ChooseDialogue & get_choose_dialogue() const { return choose_dialogue; }
        ChooseDialogue & get_mutable_choose_dialogue() { return choose_dialogue; }
        void set_choose_dialogue(const ChooseDialogue & value) { this->choose_dialogue = value; }

        const TrainClass & get_drop_item() const { return drop_item; }
        TrainClass & get_mutable_drop_item() { return drop_item; }
        void set_drop_item(const TrainClass & value) { this->drop_item = value; }

        const EquipItem & get_equip_item() const { return equip_item; }
        EquipItem & get_mutable_equip_item() { return equip_item; }
        void set_equip_item(const EquipItem & value) { this->equip_item = value; }

        const EvolveSkill & get_evolve_skill() const { return evolve_skill; }
        EvolveSkill & get_mutable_evolve_skill() { return evolve_skill; }
        void set_evolve_skill(const EvolveSkill & value) { this->evolve_skill = value; }

        const MurderClass & get_fight() const { return fight; }
        MurderClass & get_mutable_fight() { return fight; }
        void set_fight(const MurderClass & value) { this->fight = value; }

        const EscapeGateClass & get_flee() const { return flee; }
        EscapeGateClass & get_mutable_flee() { return flee; }
        void set_flee(const EscapeGateClass & value) { this->flee = value; }

        const LiveStreamClass & get_live_stream() const { return live_stream; }
        LiveStreamClass & get_mutable_live_stream() { return live_stream; }
        void set_live_stream(const LiveStreamClass & value) { this->live_stream = value; }

        const Move & get_move() const { return move; }
        Move & get_mutable_move() { return move; }
        void set_move(const Move & value) { this->move = value; }

        const MurderClass & get_murder() const { return murder; }
        MurderClass & get_mutable_murder() { return murder; }
        void set_murder(const MurderClass & value) { this->murder = value; }

        const ActionSemanticsPurchase & get_purchase() const { return purchase; }
        ActionSemanticsPurchase & get_mutable_purchase() { return purchase; }
        void set_purchase(const ActionSemanticsPurchase & value) { this->purchase = value; }

        const EquipItem & get_re_equip() const { return re_equip; }
        EquipItem & get_mutable_re_equip() { return re_equip; }
        void set_re_equip(const EquipItem & value) { this->re_equip = value; }

        const LiveStreamClass & get_recruit() const { return recruit; }
        LiveStreamClass & get_mutable_recruit() { return recruit; }
        void set_recruit(const LiveStreamClass & value) { this->recruit = value; }

        const ActionSemanticsRest & get_rest() const { return rest; }
        ActionSemanticsRest & get_mutable_rest() { return rest; }
        void set_rest(const ActionSemanticsRest & value) { this->rest = value; }

        const Search & get_search() const { return search; }
        Search & get_mutable_search() { return search; }
        void set_search(const Search & value) { this->search = value; }

        const LiveStreamClass & get_speak() const { return speak; }
        LiveStreamClass & get_mutable_speak() { return speak; }
        void set_speak(const LiveStreamClass & value) { this->speak = value; }

        const Search & get_steal() const { return steal; }
        Search & get_mutable_steal() { return steal; }
        void set_steal(const Search & value) { this->steal = value; }

        const LiveStreamClass & get_talk() const { return talk; }
        LiveStreamClass & get_mutable_talk() { return talk; }
        void set_talk(const LiveStreamClass & value) { this->talk = value; }

        const TrainClass & get_train() const { return train; }
        TrainClass & get_mutable_train() { return train; }
        void set_train(const TrainClass & value) { this->train = value; }

        const UseItemClass & get_use_item() const { return use_item; }
        UseItemClass & get_mutable_use_item() { return use_item; }
        void set_use_item(const UseItemClass & value) { this->use_item = value; }
    };

    class ActionStyle {
        public:
        ActionStyle() = default;
        virtual ~ActionStyle() = default;

        private:
        std::string choose_dialogue;
        std::string evolve_skill;
        std::string fight;
        std::string flee;
        std::string live_stream;
        std::string purchase;
        std::string rest;
        std::string search;
        std::string talk;
        std::string train;

        public:
        const std::string & get_choose_dialogue() const { return choose_dialogue; }
        std::string & get_mutable_choose_dialogue() { return choose_dialogue; }
        void set_choose_dialogue(const std::string & value) { this->choose_dialogue = value; }

        const std::string & get_evolve_skill() const { return evolve_skill; }
        std::string & get_mutable_evolve_skill() { return evolve_skill; }
        void set_evolve_skill(const std::string & value) { this->evolve_skill = value; }

        const std::string & get_fight() const { return fight; }
        std::string & get_mutable_fight() { return fight; }
        void set_fight(const std::string & value) { this->fight = value; }

        const std::string & get_flee() const { return flee; }
        std::string & get_mutable_flee() { return flee; }
        void set_flee(const std::string & value) { this->flee = value; }

        const std::string & get_live_stream() const { return live_stream; }
        std::string & get_mutable_live_stream() { return live_stream; }
        void set_live_stream(const std::string & value) { this->live_stream = value; }

        const std::string & get_purchase() const { return purchase; }
        std::string & get_mutable_purchase() { return purchase; }
        void set_purchase(const std::string & value) { this->purchase = value; }

        const std::string & get_rest() const { return rest; }
        std::string & get_mutable_rest() { return rest; }
        void set_rest(const std::string & value) { this->rest = value; }

        const std::string & get_search() const { return search; }
        std::string & get_mutable_search() { return search; }
        void set_search(const std::string & value) { this->search = value; }

        const std::string & get_talk() const { return talk; }
        std::string & get_mutable_talk() { return talk; }
        void set_talk(const std::string & value) { this->talk = value; }

        const std::string & get_train() const { return train; }
        std::string & get_mutable_train() { return train; }
        void set_train(const std::string & value) { this->train = value; }
    };

    class EventStyle {
        public:
        EventStyle() = default;
        virtual ~EventStyle() = default;

        private:
        std::string deterministic;
        std::string emergent;

        public:
        const std::string & get_deterministic() const { return deterministic; }
        std::string & get_mutable_deterministic() { return deterministic; }
        void set_deterministic(const std::string & value) { this->deterministic = value; }

        const std::string & get_emergent() const { return emergent; }
        std::string & get_mutable_emergent() { return emergent; }
        void set_emergent(const std::string & value) { this->emergent = value; }
    };

    class RoomStyle {
        public:
        RoomStyle() = default;
        virtual ~RoomStyle() = default;

        private:
        std::string combat;
        std::string rest;

        public:
        const std::string & get_combat() const { return combat; }
        std::string & get_mutable_combat() { return combat; }
        void set_combat(const std::string & value) { this->combat = value; }

        const std::string & get_rest() const { return rest; }
        std::string & get_mutable_rest() { return rest; }
        void set_rest(const std::string & value) { this->rest = value; }
    };

    class BehaviorDefaults {
        public:
        BehaviorDefaults() = default;
        virtual ~BehaviorDefaults() = default;

        private:
        ActionStyle action_style;
        EventStyle event_style;
        RoomStyle room_style;
        int64_t step_seconds;
        int64_t window_seconds;

        public:
        const ActionStyle & get_action_style() const { return action_style; }
        ActionStyle & get_mutable_action_style() { return action_style; }
        void set_action_style(const ActionStyle & value) { this->action_style = value; }

        const EventStyle & get_event_style() const { return event_style; }
        EventStyle & get_mutable_event_style() { return event_style; }
        void set_event_style(const EventStyle & value) { this->event_style = value; }

        const RoomStyle & get_room_style() const { return room_style; }
        RoomStyle & get_mutable_room_style() { return room_style; }
        void set_room_style(const RoomStyle & value) { this->room_style = value; }

        const int64_t & get_step_seconds() const { return step_seconds; }
        int64_t & get_mutable_step_seconds() { return step_seconds; }
        void set_step_seconds(const int64_t & value) { this->step_seconds = value; }

        const int64_t & get_window_seconds() const { return window_seconds; }
        int64_t & get_mutable_window_seconds() { return window_seconds; }
        void set_window_seconds(const int64_t & value) { this->window_seconds = value; }
    };

    class VectorProfile {
        public:
        VectorProfile() = default;
        virtual ~VectorProfile() = default;

        private:
        boost::optional<double> comprehension;
        boost::optional<double> constraint;
        boost::optional<double> construction;
        boost::optional<double> direction;
        boost::optional<double> empathy;
        boost::optional<double> equilibrium;
        boost::optional<double> freedom;
        boost::optional<double> levity;
        boost::optional<double> projection;
        boost::optional<double> survival;

        public:
        boost::optional<double> get_comprehension() const { return comprehension; }
        void set_comprehension(boost::optional<double> value) { this->comprehension = value; }

        boost::optional<double> get_constraint() const { return constraint; }
        void set_constraint(boost::optional<double> value) { this->constraint = value; }

        boost::optional<double> get_construction() const { return construction; }
        void set_construction(boost::optional<double> value) { this->construction = value; }

        boost::optional<double> get_direction() const { return direction; }
        void set_direction(boost::optional<double> value) { this->direction = value; }

        boost::optional<double> get_empathy() const { return empathy; }
        void set_empathy(boost::optional<double> value) { this->empathy = value; }

        boost::optional<double> get_equilibrium() const { return equilibrium; }
        void set_equilibrium(boost::optional<double> value) { this->equilibrium = value; }

        boost::optional<double> get_freedom() const { return freedom; }
        void set_freedom(boost::optional<double> value) { this->freedom = value; }

        boost::optional<double> get_levity() const { return levity; }
        void set_levity(boost::optional<double> value) { this->levity = value; }

        boost::optional<double> get_projection() const { return projection; }
        void set_projection(boost::optional<double> value) { this->projection = value; }

        boost::optional<double> get_survival() const { return survival; }
        void set_survival(boost::optional<double> value) { this->survival = value; }
    };

    class ContentFeature {
        public:
        ContentFeature() = default;
        virtual ~ContentFeature() = default;

        private:
        std::string basis_id;
        std::string description;
        std::string label;
        VectorProfile traits;

        public:
        const std::string & get_basis_id() const { return basis_id; }
        std::string & get_mutable_basis_id() { return basis_id; }
        void set_basis_id(const std::string & value) { this->basis_id = value; }

        const std::string & get_description() const { return description; }
        std::string & get_mutable_description() { return description; }
        void set_description(const std::string & value) { this->description = value; }

        const std::string & get_label() const { return label; }
        std::string & get_mutable_label() { return label; }
        void set_label(const std::string & value) { this->label = value; }

        const VectorProfile & get_traits() const { return traits; }
        VectorProfile & get_mutable_traits() { return traits; }
        void set_traits(const VectorProfile & value) { this->traits = value; }
    };

    class EntityProjection {
        public:
        EntityProjection() = default;
        virtual ~EntityProjection() = default;

        private:
        int64_t health_risk_scale;
        int64_t mana_recovery_scale;
        double pressure_health_scale;
        double pressure_reputation_scale;
        double reputation_visibility_scale;

        public:
        const int64_t & get_health_risk_scale() const { return health_risk_scale; }
        int64_t & get_mutable_health_risk_scale() { return health_risk_scale; }
        void set_health_risk_scale(const int64_t & value) { this->health_risk_scale = value; }

        const int64_t & get_mana_recovery_scale() const { return mana_recovery_scale; }
        int64_t & get_mutable_mana_recovery_scale() { return mana_recovery_scale; }
        void set_mana_recovery_scale(const int64_t & value) { this->mana_recovery_scale = value; }

        const double & get_pressure_health_scale() const { return pressure_health_scale; }
        double & get_mutable_pressure_health_scale() { return pressure_health_scale; }
        void set_pressure_health_scale(const double & value) { this->pressure_health_scale = value; }

        const double & get_pressure_reputation_scale() const { return pressure_reputation_scale; }
        double & get_mutable_pressure_reputation_scale() { return pressure_reputation_scale; }
        void set_pressure_reputation_scale(const double & value) { this->pressure_reputation_scale = value; }

        const double & get_reputation_visibility_scale() const { return reputation_visibility_scale; }
        double & get_mutable_reputation_visibility_scale() { return reputation_visibility_scale; }
        void set_reputation_visibility_scale(const double & value) { this->reputation_visibility_scale = value; }
    };

    class Deterministic {
        public:
        Deterministic() = default;
        virtual ~Deterministic() = default;

        private:
        double pressure;

        public:
        const double & get_pressure() const { return pressure; }
        double & get_mutable_pressure() { return pressure; }
        void set_pressure(const double & value) { this->pressure = value; }
    };

    class Emergent {
        public:
        Emergent() = default;
        virtual ~Emergent() = default;

        private:
        double exploration_intensity;
        double risk;

        public:
        const double & get_exploration_intensity() const { return exploration_intensity; }
        double & get_mutable_exploration_intensity() { return exploration_intensity; }
        void set_exploration_intensity(const double & value) { this->exploration_intensity = value; }

        const double & get_risk() const { return risk; }
        double & get_mutable_risk() { return risk; }
        void set_risk(const double & value) { this->risk = value; }
    };

    class Kind {
        public:
        Kind() = default;
        virtual ~Kind() = default;

        private:
        Deterministic deterministic;
        Emergent emergent;

        public:
        const Deterministic & get_deterministic() const { return deterministic; }
        Deterministic & get_mutable_deterministic() { return deterministic; }
        void set_deterministic(const Deterministic & value) { this->deterministic = value; }

        const Emergent & get_emergent() const { return emergent; }
        Emergent & get_mutable_emergent() { return emergent; }
        void set_emergent(const Emergent & value) { this->emergent = value; }
    };

    class TurnIndex {
        public:
        TurnIndex() = default;
        virtual ~TurnIndex() = default;

        private:
        double exploration_intensity;
        double pressure;
        double risk;

        public:
        const double & get_exploration_intensity() const { return exploration_intensity; }
        double & get_mutable_exploration_intensity() { return exploration_intensity; }
        void set_exploration_intensity(const double & value) { this->exploration_intensity = value; }

        const double & get_pressure() const { return pressure; }
        double & get_mutable_pressure() { return pressure; }
        void set_pressure(const double & value) { this->pressure = value; }

        const double & get_risk() const { return risk; }
        double & get_mutable_risk() { return risk; }
        void set_risk(const double & value) { this->risk = value; }
    };

    class Metric {
        public:
        Metric() = default;
        virtual ~Metric() = default;

        private:
        LiveStreamClass player_feature;
        TurnIndex turn_index;

        public:
        const LiveStreamClass & get_player_feature() const { return player_feature; }
        LiveStreamClass & get_mutable_player_feature() { return player_feature; }
        void set_player_feature(const LiveStreamClass & value) { this->player_feature = value; }

        const TurnIndex & get_turn_index() const { return turn_index; }
        TurnIndex & get_mutable_turn_index() { return turn_index; }
        void set_turn_index(const TurnIndex & value) { this->turn_index = value; }
    };

    class EventSemantics {
        public:
        EventSemantics() = default;
        virtual ~EventSemantics() = default;

        private:
        Kind kind;
        Metric metric;

        public:
        const Kind & get_kind() const { return kind; }
        Kind & get_mutable_kind() { return kind; }
        void set_kind(const Kind & value) { this->kind = value; }

        const Metric & get_metric() const { return metric; }
        Metric & get_mutable_metric() { return metric; }
        void set_metric(const Metric & value) { this->metric = value; }
    };

    class Epic {
        public:
        Epic() = default;
        virtual ~Epic() = default;

        private:
        double pressure;
        double visibility;

        public:
        const double & get_pressure() const { return pressure; }
        double & get_mutable_pressure() { return pressure; }
        void set_pressure(const double & value) { this->pressure = value; }

        const double & get_visibility() const { return visibility; }
        double & get_mutable_visibility() { return visibility; }
        void set_visibility(const double & value) { this->visibility = value; }
    };

    class Rare {
        public:
        Rare() = default;
        virtual ~Rare() = default;

        private:
        double visibility;

        public:
        const double & get_visibility() const { return visibility; }
        double & get_mutable_visibility() { return visibility; }
        void set_visibility(const double & value) { this->visibility = value; }
    };

    class RarityWeights {
        public:
        RarityWeights() = default;
        virtual ~RarityWeights() = default;

        private:
        Epic epic;
        LiveStreamClass legendary;
        Rare rare;

        public:
        const Epic & get_epic() const { return epic; }
        Epic & get_mutable_epic() { return epic; }
        void set_epic(const Epic & value) { this->epic = value; }

        const LiveStreamClass & get_legendary() const { return legendary; }
        LiveStreamClass & get_mutable_legendary() { return legendary; }
        void set_legendary(const LiveStreamClass & value) { this->legendary = value; }

        const Rare & get_rare() const { return rare; }
        Rare & get_mutable_rare() { return rare; }
        void set_rare(const Rare & value) { this->rare = value; }
    };

    class Potion {
        public:
        Potion() = default;
        virtual ~Potion() = default;

        private:
        double recovery_intensity;

        public:
        const double & get_recovery_intensity() const { return recovery_intensity; }
        double & get_mutable_recovery_intensity() { return recovery_intensity; }
        void set_recovery_intensity(const double & value) { this->recovery_intensity = value; }
    };

    class Treasure {
        public:
        Treasure() = default;
        virtual ~Treasure() = default;

        private:
        double exploration_intensity;
        double visibility;

        public:
        const double & get_exploration_intensity() const { return exploration_intensity; }
        double & get_mutable_exploration_intensity() { return exploration_intensity; }
        void set_exploration_intensity(const double & value) { this->exploration_intensity = value; }

        const double & get_visibility() const { return visibility; }
        double & get_mutable_visibility() { return visibility; }
        void set_visibility(const double & value) { this->visibility = value; }
    };

    class Weapon {
        public:
        Weapon() = default;
        virtual ~Weapon() = default;

        private:
        double combat_intensity;
        double risk;

        public:
        const double & get_combat_intensity() const { return combat_intensity; }
        double & get_mutable_combat_intensity() { return combat_intensity; }
        void set_combat_intensity(const double & value) { this->combat_intensity = value; }

        const double & get_risk() const { return risk; }
        double & get_mutable_risk() { return risk; }
        void set_risk(const double & value) { this->risk = value; }
    };

    class TagWeights {
        public:
        TagWeights() = default;
        virtual ~TagWeights() = default;

        private:
        Potion potion;
        Treasure treasure;
        Weapon weapon;

        public:
        const Potion & get_potion() const { return potion; }
        Potion & get_mutable_potion() { return potion; }
        void set_potion(const Potion & value) { this->potion = value; }

        const Treasure & get_treasure() const { return treasure; }
        Treasure & get_mutable_treasure() { return treasure; }
        void set_treasure(const Treasure & value) { this->treasure = value; }

        const Weapon & get_weapon() const { return weapon; }
        Weapon & get_mutable_weapon() { return weapon; }
        void set_weapon(const Weapon & value) { this->weapon = value; }
    };

    class ItemSemantics {
        public:
        ItemSemantics() = default;
        virtual ~ItemSemantics() = default;

        private:
        RarityWeights rarity_weights;
        TagWeights tag_weights;

        public:
        const RarityWeights & get_rarity_weights() const { return rarity_weights; }
        RarityWeights & get_mutable_rarity_weights() { return rarity_weights; }
        void set_rarity_weights(const RarityWeights & value) { this->rarity_weights = value; }

        const TagWeights & get_tag_weights() const { return tag_weights; }
        TagWeights & get_mutable_tag_weights() { return tag_weights; }
        void set_tag_weights(const TagWeights & value) { this->tag_weights = value; }
    };

    class LevelSemantics {
        public:
        LevelSemantics() = default;
        virtual ~LevelSemantics() = default;

        private:
        int64_t combat_room_pressure_scale;
        int64_t rest_room_recovery_scale;

        public:
        const int64_t & get_combat_room_pressure_scale() const { return combat_room_pressure_scale; }
        int64_t & get_mutable_combat_room_pressure_scale() { return combat_room_pressure_scale; }
        void set_combat_room_pressure_scale(const int64_t & value) { this->combat_room_pressure_scale = value; }

        const int64_t & get_rest_room_recovery_scale() const { return rest_room_recovery_scale; }
        int64_t & get_mutable_rest_room_recovery_scale() { return rest_room_recovery_scale; }
        void set_rest_room_recovery_scale(const int64_t & value) { this->rest_room_recovery_scale = value; }
    };

    class FeatureProfile {
        public:
        FeatureProfile() = default;
        virtual ~FeatureProfile() = default;

        private:
        boost::optional<double> awareness;
        boost::optional<int64_t> effort;
        boost::optional<double> fame;
        boost::optional<double> guile;
        boost::optional<double> momentum;

        public:
        boost::optional<double> get_awareness() const { return awareness; }
        void set_awareness(boost::optional<double> value) { this->awareness = value; }

        boost::optional<int64_t> get_effort() const { return effort; }
        void set_effort(boost::optional<int64_t> value) { this->effort = value; }

        boost::optional<double> get_fame() const { return fame; }
        void set_fame(boost::optional<double> value) { this->fame = value; }

        boost::optional<double> get_guile() const { return guile; }
        void set_guile(boost::optional<double> value) { this->guile = value; }

        boost::optional<double> get_momentum() const { return momentum; }
        void set_momentum(boost::optional<double> value) { this->momentum = value; }
    };

    class PowerFeature {
        public:
        PowerFeature() = default;
        virtual ~PowerFeature() = default;

        private:
        std::string basis_id;
        std::string description;
        std::string label;
        FeatureProfile traits;

        public:
        const std::string & get_basis_id() const { return basis_id; }
        std::string & get_mutable_basis_id() { return basis_id; }
        void set_basis_id(const std::string & value) { this->basis_id = value; }

        const std::string & get_description() const { return description; }
        std::string & get_mutable_description() { return description; }
        void set_description(const std::string & value) { this->description = value; }

        const std::string & get_label() const { return label; }
        std::string & get_mutable_label() { return label; }
        void set_label(const std::string & value) { this->label = value; }

        const FeatureProfile & get_traits() const { return traits; }
        FeatureProfile & get_mutable_traits() { return traits; }
        void set_traits(const FeatureProfile & value) { this->traits = value; }
    };

    class Corridor {
        public:
        Corridor() = default;
        virtual ~Corridor() = default;

        private:
        double exploration_intensity;
        double mobility;

        public:
        const double & get_exploration_intensity() const { return exploration_intensity; }
        double & get_mutable_exploration_intensity() { return exploration_intensity; }
        void set_exploration_intensity(const double & value) { this->exploration_intensity = value; }

        const double & get_mobility() const { return mobility; }
        double & get_mutable_mobility() { return mobility; }
        void set_mobility(const double & value) { this->mobility = value; }
    };

    class StairsUp {
        public:
        StairsUp() = default;
        virtual ~StairsUp() = default;

        private:
        double exploration_intensity;
        double mobility;
        double pressure;

        public:
        const double & get_exploration_intensity() const { return exploration_intensity; }
        double & get_mutable_exploration_intensity() { return exploration_intensity; }
        void set_exploration_intensity(const double & value) { this->exploration_intensity = value; }

        const double & get_mobility() const { return mobility; }
        double & get_mutable_mobility() { return mobility; }
        void set_mobility(const double & value) { this->mobility = value; }

        const double & get_pressure() const { return pressure; }
        double & get_mutable_pressure() { return pressure; }
        void set_pressure(const double & value) { this->pressure = value; }
    };

    class Start {
        public:
        Start() = default;
        virtual ~Start() = default;

        private:
        double exploration_intensity;
        double pressure;
        double visibility;

        public:
        const double & get_exploration_intensity() const { return exploration_intensity; }
        double & get_mutable_exploration_intensity() { return exploration_intensity; }
        void set_exploration_intensity(const double & value) { this->exploration_intensity = value; }

        const double & get_pressure() const { return pressure; }
        double & get_mutable_pressure() { return pressure; }
        void set_pressure(const double & value) { this->pressure = value; }

        const double & get_visibility() const { return visibility; }
        double & get_mutable_visibility() { return visibility; }
        void set_visibility(const double & value) { this->visibility = value; }
    };

    class Training {
        public:
        Training() = default;
        virtual ~Training() = default;

        private:
        double combat_intensity;
        double pressure;
        double recovery_intensity;

        public:
        const double & get_combat_intensity() const { return combat_intensity; }
        double & get_mutable_combat_intensity() { return combat_intensity; }
        void set_combat_intensity(const double & value) { this->combat_intensity = value; }

        const double & get_pressure() const { return pressure; }
        double & get_mutable_pressure() { return pressure; }
        void set_pressure(const double & value) { this->pressure = value; }

        const double & get_recovery_intensity() const { return recovery_intensity; }
        double & get_mutable_recovery_intensity() { return recovery_intensity; }
        void set_recovery_intensity(const double & value) { this->recovery_intensity = value; }
    };

    class RoomSemantics {
        public:
        RoomSemantics() = default;
        virtual ~RoomSemantics() = default;

        private:
        MurderClass combat;
        Corridor corridor;
        LiveStreamClass dialogue;
        EscapeGateClass escape_gate;
        EscapeGateClass exit;
        ActionSemanticsRest rest;
        EvolveSkill rune_forge;
        Move stairs_down;
        StairsUp stairs_up;
        Start start;
        Training training;
        Search treasure;

        public:
        const MurderClass & get_combat() const { return combat; }
        MurderClass & get_mutable_combat() { return combat; }
        void set_combat(const MurderClass & value) { this->combat = value; }

        const Corridor & get_corridor() const { return corridor; }
        Corridor & get_mutable_corridor() { return corridor; }
        void set_corridor(const Corridor & value) { this->corridor = value; }

        const LiveStreamClass & get_dialogue() const { return dialogue; }
        LiveStreamClass & get_mutable_dialogue() { return dialogue; }
        void set_dialogue(const LiveStreamClass & value) { this->dialogue = value; }

        const EscapeGateClass & get_escape_gate() const { return escape_gate; }
        EscapeGateClass & get_mutable_escape_gate() { return escape_gate; }
        void set_escape_gate(const EscapeGateClass & value) { this->escape_gate = value; }

        const EscapeGateClass & get_exit() const { return exit; }
        EscapeGateClass & get_mutable_exit() { return exit; }
        void set_exit(const EscapeGateClass & value) { this->exit = value; }

        const ActionSemanticsRest & get_rest() const { return rest; }
        ActionSemanticsRest & get_mutable_rest() { return rest; }
        void set_rest(const ActionSemanticsRest & value) { this->rest = value; }

        const EvolveSkill & get_rune_forge() const { return rune_forge; }
        EvolveSkill & get_mutable_rune_forge() { return rune_forge; }
        void set_rune_forge(const EvolveSkill & value) { this->rune_forge = value; }

        const Move & get_stairs_down() const { return stairs_down; }
        Move & get_mutable_stairs_down() { return stairs_down; }
        void set_stairs_down(const Move & value) { this->stairs_down = value; }

        const StairsUp & get_stairs_up() const { return stairs_up; }
        StairsUp & get_mutable_stairs_up() { return stairs_up; }
        void set_stairs_up(const StairsUp & value) { this->stairs_up = value; }

        const Start & get_start() const { return start; }
        Start & get_mutable_start() { return start; }
        void set_start(const Start & value) { this->start = value; }

        const Training & get_training() const { return training; }
        Training & get_mutable_training() { return training; }
        void set_training(const Training & value) { this->training = value; }

        const Search & get_treasure() const { return treasure; }
        Search & get_mutable_treasure() { return treasure; }
        void set_treasure(const Search & value) { this->treasure = value; }
    };

    class SpaceVectors {
        public:
        SpaceVectors() = default;
        virtual ~SpaceVectors() = default;

        private:
        ActionSemantics action_semantics;
        BehaviorDefaults behavior_defaults;
        std::vector<ContentFeature> content_features;
        EntityProjection entity_projection;
        EventSemantics event_semantics;
        boost::optional<std::vector<FeatureSchema>> feature_schema;
        ItemSemantics item_semantics;
        LevelSemantics level_semantics;
        boost::optional<std::vector<ModelSchema>> model_schemas;
        std::vector<PowerFeature> power_features;
        RoomSemantics room_semantics;

        public:
        const ActionSemantics & get_action_semantics() const { return action_semantics; }
        ActionSemantics & get_mutable_action_semantics() { return action_semantics; }
        void set_action_semantics(const ActionSemantics & value) { this->action_semantics = value; }

        const BehaviorDefaults & get_behavior_defaults() const { return behavior_defaults; }
        BehaviorDefaults & get_mutable_behavior_defaults() { return behavior_defaults; }
        void set_behavior_defaults(const BehaviorDefaults & value) { this->behavior_defaults = value; }

        const std::vector<ContentFeature> & get_content_features() const { return content_features; }
        std::vector<ContentFeature> & get_mutable_content_features() { return content_features; }
        void set_content_features(const std::vector<ContentFeature> & value) { this->content_features = value; }

        const EntityProjection & get_entity_projection() const { return entity_projection; }
        EntityProjection & get_mutable_entity_projection() { return entity_projection; }
        void set_entity_projection(const EntityProjection & value) { this->entity_projection = value; }

        const EventSemantics & get_event_semantics() const { return event_semantics; }
        EventSemantics & get_mutable_event_semantics() { return event_semantics; }
        void set_event_semantics(const EventSemantics & value) { this->event_semantics = value; }

        boost::optional<std::vector<FeatureSchema>> get_feature_schema() const { return feature_schema; }
        void set_feature_schema(boost::optional<std::vector<FeatureSchema>> value) { this->feature_schema = value; }

        const ItemSemantics & get_item_semantics() const { return item_semantics; }
        ItemSemantics & get_mutable_item_semantics() { return item_semantics; }
        void set_item_semantics(const ItemSemantics & value) { this->item_semantics = value; }

        const LevelSemantics & get_level_semantics() const { return level_semantics; }
        LevelSemantics & get_mutable_level_semantics() { return level_semantics; }
        void set_level_semantics(const LevelSemantics & value) { this->level_semantics = value; }

        boost::optional<std::vector<ModelSchema>> get_model_schemas() const { return model_schemas; }
        void set_model_schemas(boost::optional<std::vector<ModelSchema>> value) { this->model_schemas = value; }

        const std::vector<PowerFeature> & get_power_features() const { return power_features; }
        std::vector<PowerFeature> & get_mutable_power_features() { return power_features; }
        void set_power_features(const std::vector<PowerFeature> & value) { this->power_features = value; }

        const RoomSemantics & get_room_semantics() const { return room_semantics; }
        RoomSemantics & get_mutable_room_semantics() { return room_semantics; }
        void set_room_semantics(const RoomSemantics & value) { this->room_semantics = value; }
    };

    class Action {
        public:
        Action() = default;
        virtual ~Action() = default;

        private:
        std::string action_type;
        std::string group;
        boost::optional<bool> requires_encounter;
        boost::optional<std::string> requires_room_feature;
        bool requires_target;

        public:
        const std::string & get_action_type() const { return action_type; }
        std::string & get_mutable_action_type() { return action_type; }
        void set_action_type(const std::string & value) { this->action_type = value; }

        const std::string & get_group() const { return group; }
        std::string & get_mutable_group() { return group; }
        void set_group(const std::string & value) { this->group = value; }

        boost::optional<bool> get_requires_encounter() const { return requires_encounter; }
        void set_requires_encounter(boost::optional<bool> value) { this->requires_encounter = value; }

        boost::optional<std::string> get_requires_room_feature() const { return requires_room_feature; }
        void set_requires_room_feature(boost::optional<std::string> value) { this->requires_room_feature = value; }

        const bool & get_requires_target() const { return requires_target; }
        bool & get_mutable_requires_target() { return requires_target; }
        void set_requires_target(const bool & value) { this->requires_target = value; }
    };

    class ActionCatalog {
        public:
        ActionCatalog() = default;
        virtual ~ActionCatalog() = default;

        private:
        std::vector<Action> actions;

        public:
        const std::vector<Action> & get_actions() const { return actions; }
        std::vector<Action> & get_mutable_actions() { return actions; }
        void set_actions(const std::vector<Action> & value) { this->actions = value; }
    };

    class DropItemFeatureDelta {
        public:
        DropItemFeatureDelta() = default;
        virtual ~DropItemFeatureDelta() = default;

        private:
        double momentum;

        public:
        const double & get_momentum() const { return momentum; }
        double & get_mutable_momentum() { return momentum; }
        void set_momentum(const double & value) { this->momentum = value; }
    };

    class DropItemClass {
        public:
        DropItemClass() = default;
        virtual ~DropItemClass() = default;

        private:
        DropItemFeatureDelta feature_delta;

        public:
        const DropItemFeatureDelta & get_feature_delta() const { return feature_delta; }
        DropItemFeatureDelta & get_mutable_feature_delta() { return feature_delta; }
        void set_feature_delta(const DropItemFeatureDelta & value) { this->feature_delta = value; }
    };

    class FightTraitDelta {
        public:
        FightTraitDelta() = default;
        virtual ~FightTraitDelta() = default;

        private:
        double direction;
        double survival;

        public:
        const double & get_direction() const { return direction; }
        double & get_mutable_direction() { return direction; }
        void set_direction(const double & value) { this->direction = value; }

        const double & get_survival() const { return survival; }
        double & get_mutable_survival() { return survival; }
        void set_survival(const double & value) { this->survival = value; }
    };

    class ActionsFight {
        public:
        ActionsFight() = default;
        virtual ~ActionsFight() = default;

        private:
        DropItemFeatureDelta feature_delta;
        FightTraitDelta trait_delta;
        int64_t xp_delta;

        public:
        const DropItemFeatureDelta & get_feature_delta() const { return feature_delta; }
        DropItemFeatureDelta & get_mutable_feature_delta() { return feature_delta; }
        void set_feature_delta(const DropItemFeatureDelta & value) { this->feature_delta = value; }

        const FightTraitDelta & get_trait_delta() const { return trait_delta; }
        FightTraitDelta & get_mutable_trait_delta() { return trait_delta; }
        void set_trait_delta(const FightTraitDelta & value) { this->trait_delta = value; }

        const int64_t & get_xp_delta() const { return xp_delta; }
        int64_t & get_mutable_xp_delta() { return xp_delta; }
        void set_xp_delta(const int64_t & value) { this->xp_delta = value; }
    };

    class FleeTraitDelta {
        public:
        FleeTraitDelta() = default;
        virtual ~FleeTraitDelta() = default;

        private:
        double survival;

        public:
        const double & get_survival() const { return survival; }
        double & get_mutable_survival() { return survival; }
        void set_survival(const double & value) { this->survival = value; }
    };

    class ActionsFlee {
        public:
        ActionsFlee() = default;
        virtual ~ActionsFlee() = default;

        private:
        FleeTraitDelta trait_delta;

        public:
        const FleeTraitDelta & get_trait_delta() const { return trait_delta; }
        FleeTraitDelta & get_mutable_trait_delta() { return trait_delta; }
        void set_trait_delta(const FleeTraitDelta & value) { this->trait_delta = value; }
    };

    class LiveStreamTraitDelta {
        public:
        LiveStreamTraitDelta() = default;
        virtual ~LiveStreamTraitDelta() = default;

        private:
        double projection;

        public:
        const double & get_projection() const { return projection; }
        double & get_mutable_projection() { return projection; }
        void set_projection(const double & value) { this->projection = value; }
    };

    class LiveStream {
        public:
        LiveStream() = default;
        virtual ~LiveStream() = default;

        private:
        int64_t effort_cost;
        DropItemFeatureDelta feature_delta;
        LiveStreamTraitDelta trait_delta;

        public:
        const int64_t & get_effort_cost() const { return effort_cost; }
        int64_t & get_mutable_effort_cost() { return effort_cost; }
        void set_effort_cost(const int64_t & value) { this->effort_cost = value; }

        const DropItemFeatureDelta & get_feature_delta() const { return feature_delta; }
        DropItemFeatureDelta & get_mutable_feature_delta() { return feature_delta; }
        void set_feature_delta(const DropItemFeatureDelta & value) { this->feature_delta = value; }

        const LiveStreamTraitDelta & get_trait_delta() const { return trait_delta; }
        LiveStreamTraitDelta & get_mutable_trait_delta() { return trait_delta; }
        void set_trait_delta(const LiveStreamTraitDelta & value) { this->trait_delta = value; }
    };

    class MurderTraitDelta {
        public:
        MurderTraitDelta() = default;
        virtual ~MurderTraitDelta() = default;

        private:
        double constraint;
        double survival;

        public:
        const double & get_constraint() const { return constraint; }
        double & get_mutable_constraint() { return constraint; }
        void set_constraint(const double & value) { this->constraint = value; }

        const double & get_survival() const { return survival; }
        double & get_mutable_survival() { return survival; }
        void set_survival(const double & value) { this->survival = value; }
    };

    class Murder {
        public:
        Murder() = default;
        virtual ~Murder() = default;

        private:
        DropItemFeatureDelta feature_delta;
        int64_t reputation_delta;
        MurderTraitDelta trait_delta;
        int64_t xp_delta;

        public:
        const DropItemFeatureDelta & get_feature_delta() const { return feature_delta; }
        DropItemFeatureDelta & get_mutable_feature_delta() { return feature_delta; }
        void set_feature_delta(const DropItemFeatureDelta & value) { this->feature_delta = value; }

        const int64_t & get_reputation_delta() const { return reputation_delta; }
        int64_t & get_mutable_reputation_delta() { return reputation_delta; }
        void set_reputation_delta(const int64_t & value) { this->reputation_delta = value; }

        const MurderTraitDelta & get_trait_delta() const { return trait_delta; }
        MurderTraitDelta & get_mutable_trait_delta() { return trait_delta; }
        void set_trait_delta(const MurderTraitDelta & value) { this->trait_delta = value; }

        const int64_t & get_xp_delta() const { return xp_delta; }
        int64_t & get_mutable_xp_delta() { return xp_delta; }
        void set_xp_delta(const int64_t & value) { this->xp_delta = value; }
    };

    class PurchaseFeatureDelta {
        public:
        PurchaseFeatureDelta() = default;
        virtual ~PurchaseFeatureDelta() = default;

        private:
        double awareness;
        double momentum;

        public:
        const double & get_awareness() const { return awareness; }
        double & get_mutable_awareness() { return awareness; }
        void set_awareness(const double & value) { this->awareness = value; }

        const double & get_momentum() const { return momentum; }
        double & get_mutable_momentum() { return momentum; }
        void set_momentum(const double & value) { this->momentum = value; }
    };

    class PurchaseTraitDelta {
        public:
        PurchaseTraitDelta() = default;
        virtual ~PurchaseTraitDelta() = default;

        private:
        double comprehension;
        double constraint;

        public:
        const double & get_comprehension() const { return comprehension; }
        double & get_mutable_comprehension() { return comprehension; }
        void set_comprehension(const double & value) { this->comprehension = value; }

        const double & get_constraint() const { return constraint; }
        double & get_mutable_constraint() { return constraint; }
        void set_constraint(const double & value) { this->constraint = value; }
    };

    class ActionsPurchase {
        public:
        ActionsPurchase() = default;
        virtual ~ActionsPurchase() = default;

        private:
        PurchaseFeatureDelta feature_delta;
        PurchaseTraitDelta trait_delta;

        public:
        const PurchaseFeatureDelta & get_feature_delta() const { return feature_delta; }
        PurchaseFeatureDelta & get_mutable_feature_delta() { return feature_delta; }
        void set_feature_delta(const PurchaseFeatureDelta & value) { this->feature_delta = value; }

        const PurchaseTraitDelta & get_trait_delta() const { return trait_delta; }
        PurchaseTraitDelta & get_mutable_trait_delta() { return trait_delta; }
        void set_trait_delta(const PurchaseTraitDelta & value) { this->trait_delta = value; }
    };

    class RecruitFeatureDelta {
        public:
        RecruitFeatureDelta() = default;
        virtual ~RecruitFeatureDelta() = default;

        private:
        double awareness;

        public:
        const double & get_awareness() const { return awareness; }
        double & get_mutable_awareness() { return awareness; }
        void set_awareness(const double & value) { this->awareness = value; }
    };

    class TraitDelta {
        public:
        TraitDelta() = default;
        virtual ~TraitDelta() = default;

        private:
        double empathy;

        public:
        const double & get_empathy() const { return empathy; }
        double & get_mutable_empathy() { return empathy; }
        void set_empathy(const double & value) { this->empathy = value; }
    };

    class Recruit {
        public:
        Recruit() = default;
        virtual ~Recruit() = default;

        private:
        RecruitFeatureDelta feature_delta;
        TraitDelta trait_delta;

        public:
        const RecruitFeatureDelta & get_feature_delta() const { return feature_delta; }
        RecruitFeatureDelta & get_mutable_feature_delta() { return feature_delta; }
        void set_feature_delta(const RecruitFeatureDelta & value) { this->feature_delta = value; }

        const TraitDelta & get_trait_delta() const { return trait_delta; }
        TraitDelta & get_mutable_trait_delta() { return trait_delta; }
        void set_trait_delta(const TraitDelta & value) { this->trait_delta = value; }
    };

    class RestTraitDelta {
        public:
        RestTraitDelta() = default;
        virtual ~RestTraitDelta() = default;

        private:
        double equilibrium;
        double levity;

        public:
        const double & get_equilibrium() const { return equilibrium; }
        double & get_mutable_equilibrium() { return equilibrium; }
        void set_equilibrium(const double & value) { this->equilibrium = value; }

        const double & get_levity() const { return levity; }
        double & get_mutable_levity() { return levity; }
        void set_levity(const double & value) { this->levity = value; }
    };

    class ActionsRest {
        public:
        ActionsRest() = default;
        virtual ~ActionsRest() = default;

        private:
        double mana_delta_base;
        double mana_delta_rest_room;
        RestTraitDelta trait_delta;

        public:
        const double & get_mana_delta_base() const { return mana_delta_base; }
        double & get_mutable_mana_delta_base() { return mana_delta_base; }
        void set_mana_delta_base(const double & value) { this->mana_delta_base = value; }

        const double & get_mana_delta_rest_room() const { return mana_delta_rest_room; }
        double & get_mutable_mana_delta_rest_room() { return mana_delta_rest_room; }
        void set_mana_delta_rest_room(const double & value) { this->mana_delta_rest_room = value; }

        const RestTraitDelta & get_trait_delta() const { return trait_delta; }
        RestTraitDelta & get_mutable_trait_delta() { return trait_delta; }
        void set_trait_delta(const RestTraitDelta & value) { this->trait_delta = value; }
    };

    class SearchEmptyTraitDelta {
        public:
        SearchEmptyTraitDelta() = default;
        virtual ~SearchEmptyTraitDelta() = default;

        private:
        double comprehension;

        public:
        const double & get_comprehension() const { return comprehension; }
        double & get_mutable_comprehension() { return comprehension; }
        void set_comprehension(const double & value) { this->comprehension = value; }
    };

    class SearchEmpty {
        public:
        SearchEmpty() = default;
        virtual ~SearchEmpty() = default;

        private:
        SearchEmptyTraitDelta trait_delta;

        public:
        const SearchEmptyTraitDelta & get_trait_delta() const { return trait_delta; }
        SearchEmptyTraitDelta & get_mutable_trait_delta() { return trait_delta; }
        void set_trait_delta(const SearchEmptyTraitDelta & value) { this->trait_delta = value; }
    };

    class StealFeatureDelta {
        public:
        StealFeatureDelta() = default;
        virtual ~StealFeatureDelta() = default;

        private:
        double guile;

        public:
        const double & get_guile() const { return guile; }
        double & get_mutable_guile() { return guile; }
        void set_guile(const double & value) { this->guile = value; }
    };

    class Steal {
        public:
        Steal() = default;
        virtual ~Steal() = default;

        private:
        StealFeatureDelta feature_delta;
        MurderTraitDelta trait_delta;

        public:
        const StealFeatureDelta & get_feature_delta() const { return feature_delta; }
        StealFeatureDelta & get_mutable_feature_delta() { return feature_delta; }
        void set_feature_delta(const StealFeatureDelta & value) { this->feature_delta = value; }

        const MurderTraitDelta & get_trait_delta() const { return trait_delta; }
        MurderTraitDelta & get_mutable_trait_delta() { return trait_delta; }
        void set_trait_delta(const MurderTraitDelta & value) { this->trait_delta = value; }
    };

    class PurpleTraitDelta {
        public:
        PurpleTraitDelta() = default;
        virtual ~PurpleTraitDelta() = default;

        private:
        double comprehension;
        double empathy;

        public:
        const double & get_comprehension() const { return comprehension; }
        double & get_mutable_comprehension() { return comprehension; }
        void set_comprehension(const double & value) { this->comprehension = value; }

        const double & get_empathy() const { return empathy; }
        double & get_mutable_empathy() { return empathy; }
        void set_empathy(const double & value) { this->empathy = value; }
    };

    class Talk {
        public:
        Talk() = default;
        virtual ~Talk() = default;

        private:
        RecruitFeatureDelta feature_delta;
        TraitDelta no_target_trait_delta;
        PurpleTraitDelta trait_delta;

        public:
        const RecruitFeatureDelta & get_feature_delta() const { return feature_delta; }
        RecruitFeatureDelta & get_mutable_feature_delta() { return feature_delta; }
        void set_feature_delta(const RecruitFeatureDelta & value) { this->feature_delta = value; }

        const TraitDelta & get_no_target_trait_delta() const { return no_target_trait_delta; }
        TraitDelta & get_mutable_no_target_trait_delta() { return no_target_trait_delta; }
        void set_no_target_trait_delta(const TraitDelta & value) { this->no_target_trait_delta = value; }

        const PurpleTraitDelta & get_trait_delta() const { return trait_delta; }
        PurpleTraitDelta & get_mutable_trait_delta() { return trait_delta; }
        void set_trait_delta(const PurpleTraitDelta & value) { this->trait_delta = value; }
    };

    class TrainTraitDelta {
        public:
        TrainTraitDelta() = default;
        virtual ~TrainTraitDelta() = default;

        private:
        double constraint;
        double direction;

        public:
        const double & get_constraint() const { return constraint; }
        double & get_mutable_constraint() { return constraint; }
        void set_constraint(const double & value) { this->constraint = value; }

        const double & get_direction() const { return direction; }
        double & get_mutable_direction() { return direction; }
        void set_direction(const double & value) { this->direction = value; }
    };

    class Train {
        public:
        Train() = default;
        virtual ~Train() = default;

        private:
        DropItemFeatureDelta feature_delta;
        double mana_delta;
        TrainTraitDelta trait_delta;
        int64_t xp_delta;

        public:
        const DropItemFeatureDelta & get_feature_delta() const { return feature_delta; }
        DropItemFeatureDelta & get_mutable_feature_delta() { return feature_delta; }
        void set_feature_delta(const DropItemFeatureDelta & value) { this->feature_delta = value; }

        const double & get_mana_delta() const { return mana_delta; }
        double & get_mutable_mana_delta() { return mana_delta; }
        void set_mana_delta(const double & value) { this->mana_delta = value; }

        const TrainTraitDelta & get_trait_delta() const { return trait_delta; }
        TrainTraitDelta & get_mutable_trait_delta() { return trait_delta; }
        void set_trait_delta(const TrainTraitDelta & value) { this->trait_delta = value; }

        const int64_t & get_xp_delta() const { return xp_delta; }
        int64_t & get_mutable_xp_delta() { return xp_delta; }
        void set_xp_delta(const int64_t & value) { this->xp_delta = value; }
    };

    class UseItem {
        public:
        UseItem() = default;
        virtual ~UseItem() = default;

        private:
        RecruitFeatureDelta feature_delta;
        SearchEmptyTraitDelta trait_delta;

        public:
        const RecruitFeatureDelta & get_feature_delta() const { return feature_delta; }
        RecruitFeatureDelta & get_mutable_feature_delta() { return feature_delta; }
        void set_feature_delta(const RecruitFeatureDelta & value) { this->feature_delta = value; }

        const SearchEmptyTraitDelta & get_trait_delta() const { return trait_delta; }
        SearchEmptyTraitDelta & get_mutable_trait_delta() { return trait_delta; }
        void set_trait_delta(const SearchEmptyTraitDelta & value) { this->trait_delta = value; }
    };

    class Actions {
        public:
        Actions() = default;
        virtual ~Actions() = default;

        private:
        DropItemClass drop_item;
        DropItemClass equip_item;
        ActionsFight fight;
        ActionsFlee flee;
        LiveStream live_stream;
        Murder murder;
        ActionsPurchase purchase;
        Recruit recruit;
        DropItemClass re_equip;
        ActionsRest rest;
        SearchEmpty search_empty;
        Steal steal;
        Talk talk;
        Train train;
        UseItem use_item;

        public:
        const DropItemClass & get_drop_item() const { return drop_item; }
        DropItemClass & get_mutable_drop_item() { return drop_item; }
        void set_drop_item(const DropItemClass & value) { this->drop_item = value; }

        const DropItemClass & get_equip_item() const { return equip_item; }
        DropItemClass & get_mutable_equip_item() { return equip_item; }
        void set_equip_item(const DropItemClass & value) { this->equip_item = value; }

        const ActionsFight & get_fight() const { return fight; }
        ActionsFight & get_mutable_fight() { return fight; }
        void set_fight(const ActionsFight & value) { this->fight = value; }

        const ActionsFlee & get_flee() const { return flee; }
        ActionsFlee & get_mutable_flee() { return flee; }
        void set_flee(const ActionsFlee & value) { this->flee = value; }

        const LiveStream & get_live_stream() const { return live_stream; }
        LiveStream & get_mutable_live_stream() { return live_stream; }
        void set_live_stream(const LiveStream & value) { this->live_stream = value; }

        const Murder & get_murder() const { return murder; }
        Murder & get_mutable_murder() { return murder; }
        void set_murder(const Murder & value) { this->murder = value; }

        const ActionsPurchase & get_purchase() const { return purchase; }
        ActionsPurchase & get_mutable_purchase() { return purchase; }
        void set_purchase(const ActionsPurchase & value) { this->purchase = value; }

        const Recruit & get_recruit() const { return recruit; }
        Recruit & get_mutable_recruit() { return recruit; }
        void set_recruit(const Recruit & value) { this->recruit = value; }

        const DropItemClass & get_re_equip() const { return re_equip; }
        DropItemClass & get_mutable_re_equip() { return re_equip; }
        void set_re_equip(const DropItemClass & value) { this->re_equip = value; }

        const ActionsRest & get_rest() const { return rest; }
        ActionsRest & get_mutable_rest() { return rest; }
        void set_rest(const ActionsRest & value) { this->rest = value; }

        const SearchEmpty & get_search_empty() const { return search_empty; }
        SearchEmpty & get_mutable_search_empty() { return search_empty; }
        void set_search_empty(const SearchEmpty & value) { this->search_empty = value; }

        const Steal & get_steal() const { return steal; }
        Steal & get_mutable_steal() { return steal; }
        void set_steal(const Steal & value) { this->steal = value; }

        const Talk & get_talk() const { return talk; }
        Talk & get_mutable_talk() { return talk; }
        void set_talk(const Talk & value) { this->talk = value; }

        const Train & get_train() const { return train; }
        Train & get_mutable_train() { return train; }
        void set_train(const Train & value) { this->train = value; }

        const UseItem & get_use_item() const { return use_item; }
        UseItem & get_mutable_use_item() { return use_item; }
        void set_use_item(const UseItem & value) { this->use_item = value; }
    };

    class DeedProjection {
        public:
        DeedProjection() = default;
        virtual ~DeedProjection() = default;

        private:
        double global_budget;
        double per_feature_cap;

        public:
        const double & get_global_budget() const { return global_budget; }
        double & get_mutable_global_budget() { return global_budget; }
        void set_global_budget(const double & value) { this->global_budget = value; }

        const double & get_per_feature_cap() const { return per_feature_cap; }
        double & get_mutable_per_feature_cap() { return per_feature_cap; }
        void set_per_feature_cap(const double & value) { this->per_feature_cap = value; }
    };

    class EntityPressure {
        public:
        EntityPressure() = default;
        virtual ~EntityPressure() = default;

        private:
        int64_t cap;
        bool count_items_as_entities;

        public:
        const int64_t & get_cap() const { return cap; }
        int64_t & get_mutable_cap() { return cap; }
        void set_cap(const int64_t & value) { this->cap = value; }

        const bool & get_count_items_as_entities() const { return count_items_as_entities; }
        bool & get_mutable_count_items_as_entities() { return count_items_as_entities; }
        void set_count_items_as_entities(const bool & value) { this->count_items_as_entities = value; }
    };

    class ActionContracts {
        public:
        ActionContracts() = default;
        virtual ~ActionContracts() = default;

        private:
        Actions actions;
        int64_t canonical_seed_v1;
        DeedProjection deed_projection;
        EntityPressure entity_pressure;
        double room_influence_scale;

        public:
        const Actions & get_actions() const { return actions; }
        Actions & get_mutable_actions() { return actions; }
        void set_actions(const Actions & value) { this->actions = value; }

        const int64_t & get_canonical_seed_v1() const { return canonical_seed_v1; }
        int64_t & get_mutable_canonical_seed_v1() { return canonical_seed_v1; }
        void set_canonical_seed_v1(const int64_t & value) { this->canonical_seed_v1 = value; }

        const DeedProjection & get_deed_projection() const { return deed_projection; }
        DeedProjection & get_mutable_deed_projection() { return deed_projection; }
        void set_deed_projection(const DeedProjection & value) { this->deed_projection = value; }

        const EntityPressure & get_entity_pressure() const { return entity_pressure; }
        EntityPressure & get_mutable_entity_pressure() { return entity_pressure; }
        void set_entity_pressure(const EntityPressure & value) { this->entity_pressure = value; }

        const double & get_room_influence_scale() const { return room_influence_scale; }
        double & get_mutable_room_influence_scale() { return room_influence_scale; }
        void set_room_influence_scale(const double & value) { this->room_influence_scale = value; }
    };

    class Intent {
        public:
        Intent() = default;
        virtual ~Intent() = default;

        private:
        std::string action_type;
        std::string ui_intent;
        int64_t ui_priority;
        std::string ui_screen;

        public:
        const std::string & get_action_type() const { return action_type; }
        std::string & get_mutable_action_type() { return action_type; }
        void set_action_type(const std::string & value) { this->action_type = value; }

        const std::string & get_ui_intent() const { return ui_intent; }
        std::string & get_mutable_ui_intent() { return ui_intent; }
        void set_ui_intent(const std::string & value) { this->ui_intent = value; }

        const int64_t & get_ui_priority() const { return ui_priority; }
        int64_t & get_mutable_ui_priority() { return ui_priority; }
        void set_ui_priority(const int64_t & value) { this->ui_priority = value; }

        const std::string & get_ui_screen() const { return ui_screen; }
        std::string & get_mutable_ui_screen() { return ui_screen; }
        void set_ui_screen(const std::string & value) { this->ui_screen = value; }
    };

    class ActionIntents {
        public:
        ActionIntents() = default;
        virtual ~ActionIntents() = default;

        private:
        std::vector<Intent> intents;

        public:
        const std::vector<Intent> & get_intents() const { return intents; }
        std::vector<Intent> & get_mutable_intents() { return intents; }
        void set_intents(const std::vector<Intent> & value) { this->intents = value; }
    };

    class Policy {
        public:
        Policy() = default;
        virtual ~Policy() = default;

        private:
        std::vector<std::string> entity_kind_filter;
        std::string label;
        std::string policy_id;
        std::vector<std::string> priority_order;

        public:
        const std::vector<std::string> & get_entity_kind_filter() const { return entity_kind_filter; }
        std::vector<std::string> & get_mutable_entity_kind_filter() { return entity_kind_filter; }
        void set_entity_kind_filter(const std::vector<std::string> & value) { this->entity_kind_filter = value; }

        const std::string & get_label() const { return label; }
        std::string & get_mutable_label() { return label; }
        void set_label(const std::string & value) { this->label = value; }

        const std::string & get_policy_id() const { return policy_id; }
        std::string & get_mutable_policy_id() { return policy_id; }
        void set_policy_id(const std::string & value) { this->policy_id = value; }

        const std::vector<std::string> & get_priority_order() const { return priority_order; }
        std::vector<std::string> & get_mutable_priority_order() { return priority_order; }
        void set_priority_order(const std::vector<std::string> & value) { this->priority_order = value; }
    };

    class ActionPolicies {
        public:
        ActionPolicies() = default;
        virtual ~ActionPolicies() = default;

        private:
        std::vector<Policy> policies;

        public:
        const std::vector<Policy> & get_policies() const { return policies; }
        std::vector<Policy> & get_mutable_policies() { return policies; }
        void set_policies(const std::vector<Policy> & value) { this->policies = value; }
    };

    class VisualReference {
        public:
        VisualReference() = default;
        virtual ~VisualReference() = default;

        private:
        boost::optional<std::string> back_sprite_url;
        boost::optional<std::string> front_sprite_url;
        boost::optional<std::string> icon_sprite_url;
        std::string sprite_collection;

        public:
        boost::optional<std::string> get_back_sprite_url() const { return back_sprite_url; }
        void set_back_sprite_url(boost::optional<std::string> value) { this->back_sprite_url = value; }

        boost::optional<std::string> get_front_sprite_url() const { return front_sprite_url; }
        void set_front_sprite_url(boost::optional<std::string> value) { this->front_sprite_url = value; }

        boost::optional<std::string> get_icon_sprite_url() const { return icon_sprite_url; }
        void set_icon_sprite_url(boost::optional<std::string> value) { this->icon_sprite_url = value; }

        const std::string & get_sprite_collection() const { return sprite_collection; }
        std::string & get_mutable_sprite_collection() { return sprite_collection; }
        void set_sprite_collection(const std::string & value) { this->sprite_collection = value; }
    };

    class Archetype {
        public:
        Archetype() = default;
        virtual ~Archetype() = default;

        private:
        std::string archetype_id;
        std::string description;
        std::string label;
        std::map<std::string, double> narrative_profile;
        std::vector<std::string> preferred_skills;
        boost::optional<VisualReference> visual;

        public:
        const std::string & get_archetype_id() const { return archetype_id; }
        std::string & get_mutable_archetype_id() { return archetype_id; }
        void set_archetype_id(const std::string & value) { this->archetype_id = value; }

        const std::string & get_description() const { return description; }
        std::string & get_mutable_description() { return description; }
        void set_description(const std::string & value) { this->description = value; }

        const std::string & get_label() const { return label; }
        std::string & get_mutable_label() { return label; }
        void set_label(const std::string & value) { this->label = value; }

        const std::map<std::string, double> & get_narrative_profile() const { return narrative_profile; }
        std::map<std::string, double> & get_mutable_narrative_profile() { return narrative_profile; }
        void set_narrative_profile(const std::map<std::string, double> & value) { this->narrative_profile = value; }

        const std::vector<std::string> & get_preferred_skills() const { return preferred_skills; }
        std::vector<std::string> & get_mutable_preferred_skills() { return preferred_skills; }
        void set_preferred_skills(const std::vector<std::string> & value) { this->preferred_skills = value; }

        boost::optional<VisualReference> get_visual() const { return visual; }
        void set_visual(boost::optional<VisualReference> value) { this->visual = value; }
    };

    class ArchetypePack {
        public:
        ArchetypePack() = default;
        virtual ~ArchetypePack() = default;

        private:
        std::vector<Archetype> archetypes;

        public:
        const std::vector<Archetype> & get_archetypes() const { return archetypes; }
        std::vector<Archetype> & get_mutable_archetypes() { return archetypes; }
        void set_archetypes(const std::vector<Archetype> & value) { this->archetypes = value; }
    };

    class MinCombatStat {
        public:
        MinCombatStat() = default;
        virtual ~MinCombatStat() = default;

        private:
        std::string key;
        double value;

        public:
        const std::string & get_key() const { return key; }
        std::string & get_mutable_key() { return key; }
        void set_key(const std::string & value) { this->key = value; }

        const double & get_value() const { return value; }
        double & get_mutable_value() { return value; }
        void set_value(const double & value) { this->value = value; }
    };

    enum class TriggerKind : int { CHAPTER_COMPLETE, COMBAT_STAT_MILESTONE, ESCAPE, FAME_MILESTONE, ITEM_TAG, ROOM_ENTRY_FEATURE, ROOM_ENTRY_ROOM, SKILL_UNLOCK };

    class Cutscene {
        public:
        Cutscene() = default;
        virtual ~Cutscene() = default;

        private:
        std::string cutscene_id;
        boost::optional<MinCombatStat> min_combat_stat;
        boost::optional<double> min_fame;
        bool once;
        boost::optional<std::string> required_action_type;
        boost::optional<std::string> required_item_tag;
        boost::optional<std::string> required_room_feature;
        boost::optional<std::string> required_room_id;
        boost::optional<std::string> required_skill_id;
        std::string text;
        std::string title;
        TriggerKind trigger_kind;

        public:
        const std::string & get_cutscene_id() const { return cutscene_id; }
        std::string & get_mutable_cutscene_id() { return cutscene_id; }
        void set_cutscene_id(const std::string & value) { this->cutscene_id = value; }

        boost::optional<MinCombatStat> get_min_combat_stat() const { return min_combat_stat; }
        void set_min_combat_stat(boost::optional<MinCombatStat> value) { this->min_combat_stat = value; }

        boost::optional<double> get_min_fame() const { return min_fame; }
        void set_min_fame(boost::optional<double> value) { this->min_fame = value; }

        const bool & get_once() const { return once; }
        bool & get_mutable_once() { return once; }
        void set_once(const bool & value) { this->once = value; }

        boost::optional<std::string> get_required_action_type() const { return required_action_type; }
        void set_required_action_type(boost::optional<std::string> value) { this->required_action_type = value; }

        boost::optional<std::string> get_required_item_tag() const { return required_item_tag; }
        void set_required_item_tag(boost::optional<std::string> value) { this->required_item_tag = value; }

        boost::optional<std::string> get_required_room_feature() const { return required_room_feature; }
        void set_required_room_feature(boost::optional<std::string> value) { this->required_room_feature = value; }

        boost::optional<std::string> get_required_room_id() const { return required_room_id; }
        void set_required_room_id(boost::optional<std::string> value) { this->required_room_id = value; }

        boost::optional<std::string> get_required_skill_id() const { return required_skill_id; }
        void set_required_skill_id(boost::optional<std::string> value) { this->required_skill_id = value; }

        const std::string & get_text() const { return text; }
        std::string & get_mutable_text() { return text; }
        void set_text(const std::string & value) { this->text = value; }

        const std::string & get_title() const { return title; }
        std::string & get_mutable_title() { return title; }
        void set_title(const std::string & value) { this->title = value; }

        const TriggerKind & get_trigger_kind() const { return trigger_kind; }
        TriggerKind & get_mutable_trigger_kind() { return trigger_kind; }
        void set_trigger_kind(const TriggerKind & value) { this->trigger_kind = value; }
    };

    class CutscenePack {
        public:
        CutscenePack() = default;
        virtual ~CutscenePack() = default;

        private:
        std::vector<Cutscene> cutscenes;

        public:
        const std::vector<Cutscene> & get_cutscenes() const { return cutscenes; }
        std::vector<Cutscene> & get_mutable_cutscenes() { return cutscenes; }
        void set_cutscenes(const std::vector<Cutscene> & value) { this->cutscenes = value; }
    };

    class DialogueEntry {
        public:
        DialogueEntry() = default;
        virtual ~DialogueEntry() = default;

        private:
        boost::optional<VectorProfile> anchor_vector;
        std::string dialogue_id;
        boost::optional<VectorProfile> effect_vector;
        std::string label;
        std::string line;
        boost::optional<std::string> next_dialogue_id;
        boost::optional<double> radius;
        boost::optional<std::string> requires_item_tag_absent;
        boost::optional<std::string> requires_item_tag_present;
        boost::optional<std::string> requires_room_feature;
        boost::optional<std::string> requires_skill_id;
        std::string response_text;
        boost::optional<std::string> scene_id;
        boost::optional<std::string> take_item_tag;

        public:
        boost::optional<VectorProfile> get_anchor_vector() const { return anchor_vector; }
        void set_anchor_vector(boost::optional<VectorProfile> value) { this->anchor_vector = value; }

        const std::string & get_dialogue_id() const { return dialogue_id; }
        std::string & get_mutable_dialogue_id() { return dialogue_id; }
        void set_dialogue_id(const std::string & value) { this->dialogue_id = value; }

        boost::optional<VectorProfile> get_effect_vector() const { return effect_vector; }
        void set_effect_vector(boost::optional<VectorProfile> value) { this->effect_vector = value; }

        const std::string & get_label() const { return label; }
        std::string & get_mutable_label() { return label; }
        void set_label(const std::string & value) { this->label = value; }

        const std::string & get_line() const { return line; }
        std::string & get_mutable_line() { return line; }
        void set_line(const std::string & value) { this->line = value; }

        boost::optional<std::string> get_next_dialogue_id() const { return next_dialogue_id; }
        void set_next_dialogue_id(boost::optional<std::string> value) { this->next_dialogue_id = value; }

        boost::optional<double> get_radius() const { return radius; }
        void set_radius(boost::optional<double> value) { this->radius = value; }

        boost::optional<std::string> get_requires_item_tag_absent() const { return requires_item_tag_absent; }
        void set_requires_item_tag_absent(boost::optional<std::string> value) { this->requires_item_tag_absent = value; }

        boost::optional<std::string> get_requires_item_tag_present() const { return requires_item_tag_present; }
        void set_requires_item_tag_present(boost::optional<std::string> value) { this->requires_item_tag_present = value; }

        boost::optional<std::string> get_requires_room_feature() const { return requires_room_feature; }
        void set_requires_room_feature(boost::optional<std::string> value) { this->requires_room_feature = value; }

        boost::optional<std::string> get_requires_skill_id() const { return requires_skill_id; }
        void set_requires_skill_id(boost::optional<std::string> value) { this->requires_skill_id = value; }

        const std::string & get_response_text() const { return response_text; }
        std::string & get_mutable_response_text() { return response_text; }
        void set_response_text(const std::string & value) { this->response_text = value; }

        boost::optional<std::string> get_scene_id() const { return scene_id; }
        void set_scene_id(boost::optional<std::string> value) { this->scene_id = value; }

        boost::optional<std::string> get_take_item_tag() const { return take_item_tag; }
        void set_take_item_tag(boost::optional<std::string> value) { this->take_item_tag = value; }
    };

    class PresenterDefaults {
        public:
        PresenterDefaults() = default;
        virtual ~PresenterDefaults() = default;

        private:
        std::string cutscene_title;
        std::string speak_intent_text;

        public:
        const std::string & get_cutscene_title() const { return cutscene_title; }
        std::string & get_mutable_cutscene_title() { return cutscene_title; }
        void set_cutscene_title(const std::string & value) { this->cutscene_title = value; }

        const std::string & get_speak_intent_text() const { return speak_intent_text; }
        std::string & get_mutable_speak_intent_text() { return speak_intent_text; }
        void set_speak_intent_text(const std::string & value) { this->speak_intent_text = value; }
    };

    class PresenterInitialFeed {
        public:
        PresenterInitialFeed() = default;
        virtual ~PresenterInitialFeed() = default;

        private:
        std::string boot_1;
        std::string boot_2;
        std::string boot_3_prefix;
        std::string boot_3_suffix;

        public:
        const std::string & get_boot_1() const { return boot_1; }
        std::string & get_mutable_boot_1() { return boot_1; }
        void set_boot_1(const std::string & value) { this->boot_1 = value; }

        const std::string & get_boot_2() const { return boot_2; }
        std::string & get_mutable_boot_2() { return boot_2; }
        void set_boot_2(const std::string & value) { this->boot_2 = value; }

        const std::string & get_boot_3__prefix() const { return boot_3_prefix; }
        std::string & get_mutable_boot_3__prefix() { return boot_3_prefix; }
        void set_boot_3__prefix(const std::string & value) { this->boot_3_prefix = value; }

        const std::string & get_boot_3__suffix() const { return boot_3_suffix; }
        std::string & get_mutable_boot_3__suffix() { return boot_3_suffix; }
        void set_boot_3__suffix(const std::string & value) { this->boot_3_suffix = value; }
    };

    class PresenterTemplates {
        public:
        PresenterTemplates() = default;
        virtual ~PresenterTemplates() = default;

        private:
        std::string dialogue_choose;
        std::string event_line;
        std::string warning_line;

        public:
        const std::string & get_dialogue_choose() const { return dialogue_choose; }
        std::string & get_mutable_dialogue_choose() { return dialogue_choose; }
        void set_dialogue_choose(const std::string & value) { this->dialogue_choose = value; }

        const std::string & get_event_line() const { return event_line; }
        std::string & get_mutable_event_line() { return event_line; }
        void set_event_line(const std::string & value) { this->event_line = value; }

        const std::string & get_warning_line() const { return warning_line; }
        std::string & get_mutable_warning_line() { return warning_line; }
        void set_warning_line(const std::string & value) { this->warning_line = value; }
    };

    class PresenterStrings {
        public:
        PresenterStrings() = default;
        virtual ~PresenterStrings() = default;

        private:
        boost::optional<std::string> schema;
        std::map<std::string, std::string> action_group_titles;
        PresenterDefaults defaults;
        boost::optional<std::string> description;
        PresenterInitialFeed initial_feed;
        std::string schema_version;
        std::map<std::string, std::string> system_action_labels;
        PresenterTemplates templates;

        public:
        boost::optional<std::string> get_schema() const { return schema; }
        void set_schema(boost::optional<std::string> value) { this->schema = value; }

        const std::map<std::string, std::string> & get_action_group_titles() const { return action_group_titles; }
        std::map<std::string, std::string> & get_mutable_action_group_titles() { return action_group_titles; }
        void set_action_group_titles(const std::map<std::string, std::string> & value) { this->action_group_titles = value; }

        const PresenterDefaults & get_defaults() const { return defaults; }
        PresenterDefaults & get_mutable_defaults() { return defaults; }
        void set_defaults(const PresenterDefaults & value) { this->defaults = value; }

        boost::optional<std::string> get_description() const { return description; }
        void set_description(boost::optional<std::string> value) { this->description = value; }

        const PresenterInitialFeed & get_initial_feed() const { return initial_feed; }
        PresenterInitialFeed & get_mutable_initial_feed() { return initial_feed; }
        void set_initial_feed(const PresenterInitialFeed & value) { this->initial_feed = value; }

        const std::string & get_schema_version() const { return schema_version; }
        std::string & get_mutable_schema_version() { return schema_version; }
        void set_schema_version(const std::string & value) { this->schema_version = value; }

        const std::map<std::string, std::string> & get_system_action_labels() const { return system_action_labels; }
        std::map<std::string, std::string> & get_mutable_system_action_labels() { return system_action_labels; }
        void set_system_action_labels(const std::map<std::string, std::string> & value) { this->system_action_labels = value; }

        const PresenterTemplates & get_templates() const { return templates; }
        PresenterTemplates & get_mutable_templates() { return templates; }
        void set_templates(const PresenterTemplates & value) { this->templates = value; }
    };

    class DialoguePack {
        public:
        DialoguePack() = default;
        virtual ~DialoguePack() = default;

        private:
        std::vector<DialogueEntry> dialogues;
        PresenterStrings presenter_strings;

        public:
        const std::vector<DialogueEntry> & get_dialogues() const { return dialogues; }
        std::vector<DialogueEntry> & get_mutable_dialogues() { return dialogues; }
        void set_dialogues(const std::vector<DialogueEntry> & value) { this->dialogues = value; }

        const PresenterStrings & get_presenter_strings() const { return presenter_strings; }
        PresenterStrings & get_mutable_presenter_strings() { return presenter_strings; }
        void set_presenter_strings(const PresenterStrings & value) { this->presenter_strings = value; }
    };

    class DungeonOrigin {
        public:
        DungeonOrigin() = default;
        virtual ~DungeonOrigin() = default;

        private:
        double x;
        double y;
        double z;

        public:
        const double & get_x() const { return x; }
        double & get_mutable_x() { return x; }
        void set_x(const double & value) { this->x = value; }

        const double & get_y() const { return y; }
        double & get_mutable_y() { return y; }
        void set_y(const double & value) { this->y = value; }

        const double & get_z() const { return z; }
        double & get_mutable_z() { return z; }
        void set_z(const double & value) { this->z = value; }
    };

    class ItemBlueprint {
        public:
        ItemBlueprint() = default;
        virtual ~ItemBlueprint() = default;

        private:
        std::string description;
        std::string item_blueprint_id;
        std::string name;
        std::string rarity;
        std::vector<std::string> tags;
        boost::optional<std::map<std::string, double>> vector_delta;

        public:
        const std::string & get_description() const { return description; }
        std::string & get_mutable_description() { return description; }
        void set_description(const std::string & value) { this->description = value; }

        const std::string & get_item_blueprint_id() const { return item_blueprint_id; }
        std::string & get_mutable_item_blueprint_id() { return item_blueprint_id; }
        void set_item_blueprint_id(const std::string & value) { this->item_blueprint_id = value; }

        const std::string & get_name() const { return name; }
        std::string & get_mutable_name() { return name; }
        void set_name(const std::string & value) { this->name = value; }

        const std::string & get_rarity() const { return rarity; }
        std::string & get_mutable_rarity() { return rarity; }
        void set_rarity(const std::string & value) { this->rarity = value; }

        const std::vector<std::string> & get_tags() const { return tags; }
        std::vector<std::string> & get_mutable_tags() { return tags; }
        void set_tags(const std::vector<std::string> & value) { this->tags = value; }

        boost::optional<std::map<std::string, double>> get_vector_delta() const { return vector_delta; }
        void set_vector_delta(boost::optional<std::map<std::string, double>> value) { this->vector_delta = value; }
    };

    class Exit {
        public:
        Exit() = default;
        virtual ~Exit() = default;

        private:
        int64_t depth;
        std::string direction;
        std::string room_id;

        public:
        const int64_t & get_depth() const { return depth; }
        int64_t & get_mutable_depth() { return depth; }
        void set_depth(const int64_t & value) { this->depth = value; }

        const std::string & get_direction() const { return direction; }
        std::string & get_mutable_direction() { return direction; }
        void set_direction(const std::string & value) { this->direction = value; }

        const std::string & get_room_id() const { return room_id; }
        std::string & get_mutable_room_id() { return room_id; }
        void set_room_id(const std::string & value) { this->room_id = value; }
    };

    class Transform {
        public:
        Transform() = default;
        virtual ~Transform() = default;

        private:
        DungeonOrigin position;
        DungeonOrigin rotation;
        DungeonOrigin scale;

        public:
        const DungeonOrigin & get_position() const { return position; }
        DungeonOrigin & get_mutable_position() { return position; }
        void set_position(const DungeonOrigin & value) { this->position = value; }

        const DungeonOrigin & get_rotation() const { return rotation; }
        DungeonOrigin & get_mutable_rotation() { return rotation; }
        void set_rotation(const DungeonOrigin & value) { this->rotation = value; }

        const DungeonOrigin & get_scale() const { return scale; }
        DungeonOrigin & get_mutable_scale() { return scale; }
        void set_scale(const DungeonOrigin & value) { this->scale = value; }
    };

    class RoomItem {
        public:
        RoomItem() = default;
        virtual ~RoomItem() = default;

        private:
        std::string description;
        bool is_present;
        std::string item_blueprint_id;
        std::string item_id;
        std::string name;
        std::string rarity;
        std::vector<std::string> tags;
        Transform transform;
        boost::optional<std::map<std::string, double>> vector_delta;

        public:
        const std::string & get_description() const { return description; }
        std::string & get_mutable_description() { return description; }
        void set_description(const std::string & value) { this->description = value; }

        const bool & get_is_present() const { return is_present; }
        bool & get_mutable_is_present() { return is_present; }
        void set_is_present(const bool & value) { this->is_present = value; }

        const std::string & get_item_blueprint_id() const { return item_blueprint_id; }
        std::string & get_mutable_item_blueprint_id() { return item_blueprint_id; }
        void set_item_blueprint_id(const std::string & value) { this->item_blueprint_id = value; }

        const std::string & get_item_id() const { return item_id; }
        std::string & get_mutable_item_id() { return item_id; }
        void set_item_id(const std::string & value) { this->item_id = value; }

        const std::string & get_name() const { return name; }
        std::string & get_mutable_name() { return name; }
        void set_name(const std::string & value) { this->name = value; }

        const std::string & get_rarity() const { return rarity; }
        std::string & get_mutable_rarity() { return rarity; }
        void set_rarity(const std::string & value) { this->rarity = value; }

        const std::vector<std::string> & get_tags() const { return tags; }
        std::vector<std::string> & get_mutable_tags() { return tags; }
        void set_tags(const std::vector<std::string> & value) { this->tags = value; }

        const Transform & get_transform() const { return transform; }
        Transform & get_mutable_transform() { return transform; }
        void set_transform(const Transform & value) { this->transform = value; }

        boost::optional<std::map<std::string, double>> get_vector_delta() const { return vector_delta; }
        void set_vector_delta(boost::optional<std::map<std::string, double>> value) { this->vector_delta = value; }
    };

    class Room {
        public:
        Room() = default;
        virtual ~Room() = default;

        private:
        VectorProfile base_vector;
        int64_t column;
        std::string description;
        std::vector<Exit> exits;
        std::string feature;
        int64_t index;
        std::vector<RoomItem> items;
        std::string name;
        std::string room_blueprint_id;
        std::string room_id;
        int64_t row;
        Transform transform;

        public:
        const VectorProfile & get_base_vector() const { return base_vector; }
        VectorProfile & get_mutable_base_vector() { return base_vector; }
        void set_base_vector(const VectorProfile & value) { this->base_vector = value; }

        const int64_t & get_column() const { return column; }
        int64_t & get_mutable_column() { return column; }
        void set_column(const int64_t & value) { this->column = value; }

        const std::string & get_description() const { return description; }
        std::string & get_mutable_description() { return description; }
        void set_description(const std::string & value) { this->description = value; }

        const std::vector<Exit> & get_exits() const { return exits; }
        std::vector<Exit> & get_mutable_exits() { return exits; }
        void set_exits(const std::vector<Exit> & value) { this->exits = value; }

        const std::string & get_feature() const { return feature; }
        std::string & get_mutable_feature() { return feature; }
        void set_feature(const std::string & value) { this->feature = value; }

        const int64_t & get_index() const { return index; }
        int64_t & get_mutable_index() { return index; }
        void set_index(const int64_t & value) { this->index = value; }

        const std::vector<RoomItem> & get_items() const { return items; }
        std::vector<RoomItem> & get_mutable_items() { return items; }
        void set_items(const std::vector<RoomItem> & value) { this->items = value; }

        const std::string & get_name() const { return name; }
        std::string & get_mutable_name() { return name; }
        void set_name(const std::string & value) { this->name = value; }

        const std::string & get_room_blueprint_id() const { return room_blueprint_id; }
        std::string & get_mutable_room_blueprint_id() { return room_blueprint_id; }
        void set_room_blueprint_id(const std::string & value) { this->room_blueprint_id = value; }

        const std::string & get_room_id() const { return room_id; }
        std::string & get_mutable_room_id() { return room_id; }
        void set_room_id(const std::string & value) { this->room_id = value; }

        const int64_t & get_row() const { return row; }
        int64_t & get_mutable_row() { return row; }
        void set_row(const int64_t & value) { this->row = value; }

        const Transform & get_transform() const { return transform; }
        Transform & get_mutable_transform() { return transform; }
        void set_transform(const Transform & value) { this->transform = value; }
    };

    class Level {
        public:
        Level() = default;
        virtual ~Level() = default;

        private:
        int64_t columns;
        int64_t depth;
        double height_scale;
        std::vector<Room> rooms;
        int64_t rows;
        Transform transform;

        public:
        const int64_t & get_columns() const { return columns; }
        int64_t & get_mutable_columns() { return columns; }
        void set_columns(const int64_t & value) { this->columns = value; }

        const int64_t & get_depth() const { return depth; }
        int64_t & get_mutable_depth() { return depth; }
        void set_depth(const int64_t & value) { this->depth = value; }

        const double & get_height_scale() const { return height_scale; }
        double & get_mutable_height_scale() { return height_scale; }
        void set_height_scale(const double & value) { this->height_scale = value; }

        const std::vector<Room> & get_rooms() const { return rooms; }
        std::vector<Room> & get_mutable_rooms() { return rooms; }
        void set_rooms(const std::vector<Room> & value) { this->rooms = value; }

        const int64_t & get_rows() const { return rows; }
        int64_t & get_mutable_rows() { return rows; }
        void set_rows(const int64_t & value) { this->rows = value; }

        const Transform & get_transform() const { return transform; }
        Transform & get_mutable_transform() { return transform; }
        void set_transform(const Transform & value) { this->transform = value; }
    };

    class RoomBlueprint {
        public:
        RoomBlueprint() = default;
        virtual ~RoomBlueprint() = default;

        private:
        VectorProfile base_vector;
        std::string description;
        std::string feature;
        std::string name;
        std::string room_blueprint_id;

        public:
        const VectorProfile & get_base_vector() const { return base_vector; }
        VectorProfile & get_mutable_base_vector() { return base_vector; }
        void set_base_vector(const VectorProfile & value) { this->base_vector = value; }

        const std::string & get_description() const { return description; }
        std::string & get_mutable_description() { return description; }
        void set_description(const std::string & value) { this->description = value; }

        const std::string & get_feature() const { return feature; }
        std::string & get_mutable_feature() { return feature; }
        void set_feature(const std::string & value) { this->feature = value; }

        const std::string & get_name() const { return name; }
        std::string & get_mutable_name() { return name; }
        void set_name(const std::string & value) { this->name = value; }

        const std::string & get_room_blueprint_id() const { return room_blueprint_id; }
        std::string & get_mutable_room_blueprint_id() { return room_blueprint_id; }
        void set_room_blueprint_id(const std::string & value) { this->room_blueprint_id = value; }
    };

    class Dungeon {
        public:
        Dungeon() = default;
        virtual ~Dungeon() = default;

        private:
        std::string dungeon_id;
        DungeonOrigin dungeon_origin;
        int64_t escape_depth;
        std::string escape_room_id;
        std::vector<ItemBlueprint> item_blueprints;
        std::vector<Level> levels;
        int64_t level_spacing;
        std::vector<RoomBlueprint> room_blueprints;
        DungeonOrigin room_size;
        int64_t start_depth;
        std::string start_room_id;
        std::string title;

        public:
        const std::string & get_dungeon_id() const { return dungeon_id; }
        std::string & get_mutable_dungeon_id() { return dungeon_id; }
        void set_dungeon_id(const std::string & value) { this->dungeon_id = value; }

        const DungeonOrigin & get_dungeon_origin() const { return dungeon_origin; }
        DungeonOrigin & get_mutable_dungeon_origin() { return dungeon_origin; }
        void set_dungeon_origin(const DungeonOrigin & value) { this->dungeon_origin = value; }

        const int64_t & get_escape_depth() const { return escape_depth; }
        int64_t & get_mutable_escape_depth() { return escape_depth; }
        void set_escape_depth(const int64_t & value) { this->escape_depth = value; }

        const std::string & get_escape_room_id() const { return escape_room_id; }
        std::string & get_mutable_escape_room_id() { return escape_room_id; }
        void set_escape_room_id(const std::string & value) { this->escape_room_id = value; }

        const std::vector<ItemBlueprint> & get_item_blueprints() const { return item_blueprints; }
        std::vector<ItemBlueprint> & get_mutable_item_blueprints() { return item_blueprints; }
        void set_item_blueprints(const std::vector<ItemBlueprint> & value) { this->item_blueprints = value; }

        const std::vector<Level> & get_levels() const { return levels; }
        std::vector<Level> & get_mutable_levels() { return levels; }
        void set_levels(const std::vector<Level> & value) { this->levels = value; }

        const int64_t & get_level_spacing() const { return level_spacing; }
        int64_t & get_mutable_level_spacing() { return level_spacing; }
        void set_level_spacing(const int64_t & value) { this->level_spacing = value; }

        const std::vector<RoomBlueprint> & get_room_blueprints() const { return room_blueprints; }
        std::vector<RoomBlueprint> & get_mutable_room_blueprints() { return room_blueprints; }
        void set_room_blueprints(const std::vector<RoomBlueprint> & value) { this->room_blueprints = value; }

        const DungeonOrigin & get_room_size() const { return room_size; }
        DungeonOrigin & get_mutable_room_size() { return room_size; }
        void set_room_size(const DungeonOrigin & value) { this->room_size = value; }

        const int64_t & get_start_depth() const { return start_depth; }
        int64_t & get_mutable_start_depth() { return start_depth; }
        void set_start_depth(const int64_t & value) { this->start_depth = value; }

        const std::string & get_start_room_id() const { return start_room_id; }
        std::string & get_mutable_start_room_id() { return start_room_id; }
        void set_start_room_id(const std::string & value) { this->start_room_id = value; }

        const std::string & get_title() const { return title; }
        std::string & get_mutable_title() { return title; }
        void set_title(const std::string & value) { this->title = value; }
    };

    class DungeonLayouts {
        public:
        DungeonLayouts() = default;
        virtual ~DungeonLayouts() = default;

        private:
        std::vector<Dungeon> dungeons;

        public:
        const std::vector<Dungeon> & get_dungeons() const { return dungeons; }
        std::vector<Dungeon> & get_mutable_dungeons() { return dungeons; }
        void set_dungeons(const std::vector<Dungeon> & value) { this->dungeons = value; }
    };

    class Trigger {
        public:
        Trigger() = default;
        virtual ~Trigger() = default;

        private:
        int64_t gte;
        boost::optional<std::string> key;
        std::string metric;

        public:
        const int64_t & get_gte() const { return gte; }
        int64_t & get_mutable_gte() { return gte; }
        void set_gte(const int64_t & value) { this->gte = value; }

        boost::optional<std::string> get_key() const { return key; }
        void set_key(boost::optional<std::string> value) { this->key = value; }

        const std::string & get_metric() const { return metric; }
        std::string & get_mutable_metric() { return metric; }
        void set_metric(const std::string & value) { this->metric = value; }
    };

    class Event {
        public:
        Event() = default;
        virtual ~Event() = default;

        private:
        std::string event_id;
        boost::optional<int64_t> global_enemy_level_bonus_delta;
        std::string kind;
        std::string message;
        boost::optional<std::map<std::string, double>> narrative_stat_delta;
        boost::optional<double> probability;
        Trigger trigger;

        public:
        const std::string & get_event_id() const { return event_id; }
        std::string & get_mutable_event_id() { return event_id; }
        void set_event_id(const std::string & value) { this->event_id = value; }

        boost::optional<int64_t> get_global_enemy_level_bonus_delta() const { return global_enemy_level_bonus_delta; }
        void set_global_enemy_level_bonus_delta(boost::optional<int64_t> value) { this->global_enemy_level_bonus_delta = value; }

        const std::string & get_kind() const { return kind; }
        std::string & get_mutable_kind() { return kind; }
        void set_kind(const std::string & value) { this->kind = value; }

        const std::string & get_message() const { return message; }
        std::string & get_mutable_message() { return message; }
        void set_message(const std::string & value) { this->message = value; }

        boost::optional<std::map<std::string, double>> get_narrative_stat_delta() const { return narrative_stat_delta; }
        void set_narrative_stat_delta(boost::optional<std::map<std::string, double>> value) { this->narrative_stat_delta = value; }

        boost::optional<double> get_probability() const { return probability; }
        void set_probability(boost::optional<double> value) { this->probability = value; }

        const Trigger & get_trigger() const { return trigger; }
        Trigger & get_mutable_trigger() { return trigger; }
        void set_trigger(const Trigger & value) { this->trigger = value; }
    };

    class EventPack {
        public:
        EventPack() = default;
        virtual ~EventPack() = default;

        private:
        std::vector<Event> events;

        public:
        const std::vector<Event> & get_events() const { return events; }
        std::vector<Event> & get_mutable_events() { return events; }
        void set_events(const std::vector<Event> & value) { this->events = value; }
    };

    class ItemPackItem {
        public:
        ItemPackItem() = default;
        virtual ~ItemPackItem() = default;

        private:
        boost::optional<std::string> equip_slot_id;
        std::string item_id;
        boost::optional<std::string> name;
        boost::optional<std::string> rarity_id;
        std::vector<std::string> tags;
        boost::optional<std::map<std::string, double>> vector_delta;
        boost::optional<VisualReference> visual;

        public:
        boost::optional<std::string> get_equip_slot_id() const { return equip_slot_id; }
        void set_equip_slot_id(boost::optional<std::string> value) { this->equip_slot_id = value; }

        const std::string & get_item_id() const { return item_id; }
        std::string & get_mutable_item_id() { return item_id; }
        void set_item_id(const std::string & value) { this->item_id = value; }

        boost::optional<std::string> get_name() const { return name; }
        void set_name(boost::optional<std::string> value) { this->name = value; }

        boost::optional<std::string> get_rarity_id() const { return rarity_id; }
        void set_rarity_id(boost::optional<std::string> value) { this->rarity_id = value; }

        const std::vector<std::string> & get_tags() const { return tags; }
        std::vector<std::string> & get_mutable_tags() { return tags; }
        void set_tags(const std::vector<std::string> & value) { this->tags = value; }

        boost::optional<std::map<std::string, double>> get_vector_delta() const { return vector_delta; }
        void set_vector_delta(boost::optional<std::map<std::string, double>> value) { this->vector_delta = value; }

        boost::optional<VisualReference> get_visual() const { return visual; }
        void set_visual(boost::optional<VisualReference> value) { this->visual = value; }
    };

    class ItemPack {
        public:
        ItemPack() = default;
        virtual ~ItemPack() = default;

        private:
        std::vector<ItemPackItem> items;
        boost::optional<std::vector<std::string>> rarity_tiers;

        public:
        const std::vector<ItemPackItem> & get_items() const { return items; }
        std::vector<ItemPackItem> & get_mutable_items() { return items; }
        void set_items(const std::vector<ItemPackItem> & value) { this->items = value; }

        boost::optional<std::vector<std::string>> get_rarity_tiers() const { return rarity_tiers; }
        void set_rarity_tiers(boost::optional<std::vector<std::string>> value) { this->rarity_tiers = value; }
    };

    class ProgressRule {
        public:
        ProgressRule() = default;
        virtual ~ProgressRule() = default;

        private:
        boost::optional<std::string> action_type;
        boost::optional<int64_t> amount;
        std::string kind;
        boost::optional<bool> set_to_required;

        public:
        boost::optional<std::string> get_action_type() const { return action_type; }
        void set_action_type(boost::optional<std::string> value) { this->action_type = value; }

        boost::optional<int64_t> get_amount() const { return amount; }
        void set_amount(boost::optional<int64_t> value) { this->amount = value; }

        const std::string & get_kind() const { return kind; }
        std::string & get_mutable_kind() { return kind; }
        void set_kind(const std::string & value) { this->kind = value; }

        boost::optional<bool> get_set_to_required() const { return set_to_required; }
        void set_set_to_required(boost::optional<bool> value) { this->set_to_required = value; }
    };

    class RequiredProgress {
        public:
        RequiredProgress() = default;
        virtual ~RequiredProgress() = default;

        private:
        std::string mode;
        boost::optional<int64_t> value;

        public:
        const std::string & get_mode() const { return mode; }
        std::string & get_mutable_mode() { return mode; }
        void set_mode(const std::string & value) { this->mode = value; }

        boost::optional<int64_t> get_value() const { return value; }
        void set_value(boost::optional<int64_t> value) { this->value = value; }
    };

    class Quest {
        public:
        Quest() = default;
        virtual ~Quest() = default;

        private:
        std::string description;
        std::vector<ProgressRule> progress_rules;
        std::string quest_id;
        RequiredProgress required_progress;
        std::string title;

        public:
        const std::string & get_description() const { return description; }
        std::string & get_mutable_description() { return description; }
        void set_description(const std::string & value) { this->description = value; }

        const std::vector<ProgressRule> & get_progress_rules() const { return progress_rules; }
        std::vector<ProgressRule> & get_mutable_progress_rules() { return progress_rules; }
        void set_progress_rules(const std::vector<ProgressRule> & value) { this->progress_rules = value; }

        const std::string & get_quest_id() const { return quest_id; }
        std::string & get_mutable_quest_id() { return quest_id; }
        void set_quest_id(const std::string & value) { this->quest_id = value; }

        const RequiredProgress & get_required_progress() const { return required_progress; }
        RequiredProgress & get_mutable_required_progress() { return required_progress; }
        void set_required_progress(const RequiredProgress & value) { this->required_progress = value; }

        const std::string & get_title() const { return title; }
        std::string & get_mutable_title() { return title; }
        void set_title(const std::string & value) { this->title = value; }
    };

    class QuestPack {
        public:
        QuestPack() = default;
        virtual ~QuestPack() = default;

        private:
        std::vector<Quest> quests;

        public:
        const std::vector<Quest> & get_quests() const { return quests; }
        std::vector<Quest> & get_mutable_quests() { return quests; }
        void set_quests(const std::vector<Quest> & value) { this->quests = value; }
    };

    class Template {
        public:
        Template() = default;
        virtual ~Template() = default;

        private:
        VectorProfile base_vector;
        std::string feature;

        public:
        const VectorProfile & get_base_vector() const { return base_vector; }
        VectorProfile & get_mutable_base_vector() { return base_vector; }
        void set_base_vector(const VectorProfile & value) { this->base_vector = value; }

        const std::string & get_feature() const { return feature; }
        std::string & get_mutable_feature() { return feature; }
        void set_feature(const std::string & value) { this->feature = value; }
    };

    class RoomTemplates {
        public:
        RoomTemplates() = default;
        virtual ~RoomTemplates() = default;

        private:
        std::vector<Template> templates;

        public:
        const std::vector<Template> & get_templates() const { return templates; }
        std::vector<Template> & get_mutable_templates() { return templates; }
        void set_templates(const std::vector<Template> & value) { this->templates = value; }
    };

    class Requirement {
        public:
        Requirement() = default;
        virtual ~Requirement() = default;

        private:
        std::string description;
        boost::optional<std::string> key;
        std::string kind;
        boost::optional<double> value;

        public:
        const std::string & get_description() const { return description; }
        std::string & get_mutable_description() { return description; }
        void set_description(const std::string & value) { this->description = value; }

        boost::optional<std::string> get_key() const { return key; }
        void set_key(boost::optional<std::string> value) { this->key = value; }

        const std::string & get_kind() const { return kind; }
        std::string & get_mutable_kind() { return kind; }
        void set_kind(const std::string & value) { this->kind = value; }

        boost::optional<double> get_value() const { return value; }
        void set_value(boost::optional<double> value) { this->value = value; }
    };

    class Skill {
        public:
        Skill() = default;
        virtual ~Skill() = default;

        private:
        std::string branch;
        boost::optional<std::string> branch_group;
        std::string description;
        boost::optional<std::string> evolves_from;
        boost::optional<std::vector<std::string>> exclusive_with;
        std::string name;
        std::map<std::string, double> narrative_profile;
        std::map<std::string, double> narrative_stat_bonus;
        boost::optional<bool> requires_rune_forge;
        std::string skill_id;
        double unlock_radius;
        std::vector<Requirement> unlock_requirements;
        std::vector<Requirement> use_requirements;
        boost::optional<VisualReference> visual;

        public:
        const std::string & get_branch() const { return branch; }
        std::string & get_mutable_branch() { return branch; }
        void set_branch(const std::string & value) { this->branch = value; }

        boost::optional<std::string> get_branch_group() const { return branch_group; }
        void set_branch_group(boost::optional<std::string> value) { this->branch_group = value; }

        const std::string & get_description() const { return description; }
        std::string & get_mutable_description() { return description; }
        void set_description(const std::string & value) { this->description = value; }

        boost::optional<std::string> get_evolves_from() const { return evolves_from; }
        void set_evolves_from(boost::optional<std::string> value) { this->evolves_from = value; }

        boost::optional<std::vector<std::string>> get_exclusive_with() const { return exclusive_with; }
        void set_exclusive_with(boost::optional<std::vector<std::string>> value) { this->exclusive_with = value; }

        const std::string & get_name() const { return name; }
        std::string & get_mutable_name() { return name; }
        void set_name(const std::string & value) { this->name = value; }

        const std::map<std::string, double> & get_narrative_profile() const { return narrative_profile; }
        std::map<std::string, double> & get_mutable_narrative_profile() { return narrative_profile; }
        void set_narrative_profile(const std::map<std::string, double> & value) { this->narrative_profile = value; }

        const std::map<std::string, double> & get_narrative_stat_bonus() const { return narrative_stat_bonus; }
        std::map<std::string, double> & get_mutable_narrative_stat_bonus() { return narrative_stat_bonus; }
        void set_narrative_stat_bonus(const std::map<std::string, double> & value) { this->narrative_stat_bonus = value; }

        boost::optional<bool> get_requires_rune_forge() const { return requires_rune_forge; }
        void set_requires_rune_forge(boost::optional<bool> value) { this->requires_rune_forge = value; }

        const std::string & get_skill_id() const { return skill_id; }
        std::string & get_mutable_skill_id() { return skill_id; }
        void set_skill_id(const std::string & value) { this->skill_id = value; }

        const double & get_unlock_radius() const { return unlock_radius; }
        double & get_mutable_unlock_radius() { return unlock_radius; }
        void set_unlock_radius(const double & value) { this->unlock_radius = value; }

        const std::vector<Requirement> & get_unlock_requirements() const { return unlock_requirements; }
        std::vector<Requirement> & get_mutable_unlock_requirements() { return unlock_requirements; }
        void set_unlock_requirements(const std::vector<Requirement> & value) { this->unlock_requirements = value; }

        const std::vector<Requirement> & get_use_requirements() const { return use_requirements; }
        std::vector<Requirement> & get_mutable_use_requirements() { return use_requirements; }
        void set_use_requirements(const std::vector<Requirement> & value) { this->use_requirements = value; }

        boost::optional<VisualReference> get_visual() const { return visual; }
        void set_visual(boost::optional<VisualReference> value) { this->visual = value; }
    };

    class SkillPack {
        public:
        SkillPack() = default;
        virtual ~SkillPack() = default;

        private:
        std::vector<Skill> skills;

        public:
        const std::vector<Skill> & get_skills() const { return skills; }
        std::vector<Skill> & get_mutable_skills() { return skills; }
        void set_skills(const std::vector<Skill> & value) { this->skills = value; }
    };

    class ContentSource;

    class Packs;

    class ContentSource {
        public:
        ContentSource() = default;
        virtual ~ContentSource() = default;

        private:
        std::string schema;
        ContentSchema content_schema;
        std::shared_ptr<Packs> packs;
        std::string schema_version;
        SpaceVectors vector_runtime;

        public:
        const std::string & get_schema() const { return schema; }
        std::string & get_mutable_schema() { return schema; }
        void set_schema(const std::string & value) { this->schema = value; }

        const ContentSchema & get_content_schema() const { return content_schema; }
        ContentSchema & get_mutable_content_schema() { return content_schema; }
        void set_content_schema(const ContentSchema & value) { this->content_schema = value; }

        const std::shared_ptr<Packs> & get_packs() const { return packs; }
        std::shared_ptr<Packs> & get_mutable_packs() { return packs; }
        void set_packs(const std::shared_ptr<Packs> & value) { this->packs = value; }

        const std::string & get_schema_version() const { return schema_version; }
        std::string & get_mutable_schema_version() { return schema_version; }
        void set_schema_version(const std::string & value) { this->schema_version = value; }

        const SpaceVectors & get_vector_runtime() const { return vector_runtime; }
        SpaceVectors & get_mutable_vector_runtime() { return vector_runtime; }
        void set_vector_runtime(const SpaceVectors & value) { this->vector_runtime = value; }
    };

    class Packs {
        public:
        Packs() = default;
        virtual ~Packs() = default;

        private:
        ActionCatalog action_catalog;
        ActionContracts action_contracts;
        ActionIntents action_intents;
        ActionPolicies action_policies;
        ArchetypePack archetype_pack;
        boost::optional<ContentSchema> content_schema;
        std::shared_ptr<ContentSource> content_source;
        CutscenePack cutscene_pack;
        DialoguePack dialogue_pack;
        DungeonLayouts dungeon_layouts;
        EventPack event_pack;
        ItemPack item_pack;
        QuestPack quest_pack;
        RoomTemplates room_templates;
        SkillPack skill_pack;
        boost::optional<SpaceVectors> space_vectors;

        public:
        const ActionCatalog & get_action_catalog() const { return action_catalog; }
        ActionCatalog & get_mutable_action_catalog() { return action_catalog; }
        void set_action_catalog(const ActionCatalog & value) { this->action_catalog = value; }

        const ActionContracts & get_action_contracts() const { return action_contracts; }
        ActionContracts & get_mutable_action_contracts() { return action_contracts; }
        void set_action_contracts(const ActionContracts & value) { this->action_contracts = value; }

        const ActionIntents & get_action_intents() const { return action_intents; }
        ActionIntents & get_mutable_action_intents() { return action_intents; }
        void set_action_intents(const ActionIntents & value) { this->action_intents = value; }

        const ActionPolicies & get_action_policies() const { return action_policies; }
        ActionPolicies & get_mutable_action_policies() { return action_policies; }
        void set_action_policies(const ActionPolicies & value) { this->action_policies = value; }

        const ArchetypePack & get_archetype_pack() const { return archetype_pack; }
        ArchetypePack & get_mutable_archetype_pack() { return archetype_pack; }
        void set_archetype_pack(const ArchetypePack & value) { this->archetype_pack = value; }

        boost::optional<ContentSchema> get_content_schema() const { return content_schema; }
        void set_content_schema(boost::optional<ContentSchema> value) { this->content_schema = value; }

        std::shared_ptr<ContentSource> get_content_source() const { return content_source; }
        void set_content_source(std::shared_ptr<ContentSource> value) { this->content_source = value; }

        const CutscenePack & get_cutscene_pack() const { return cutscene_pack; }
        CutscenePack & get_mutable_cutscene_pack() { return cutscene_pack; }
        void set_cutscene_pack(const CutscenePack & value) { this->cutscene_pack = value; }

        const DialoguePack & get_dialogue_pack() const { return dialogue_pack; }
        DialoguePack & get_mutable_dialogue_pack() { return dialogue_pack; }
        void set_dialogue_pack(const DialoguePack & value) { this->dialogue_pack = value; }

        const DungeonLayouts & get_dungeon_layouts() const { return dungeon_layouts; }
        DungeonLayouts & get_mutable_dungeon_layouts() { return dungeon_layouts; }
        void set_dungeon_layouts(const DungeonLayouts & value) { this->dungeon_layouts = value; }

        const EventPack & get_event_pack() const { return event_pack; }
        EventPack & get_mutable_event_pack() { return event_pack; }
        void set_event_pack(const EventPack & value) { this->event_pack = value; }

        const ItemPack & get_item_pack() const { return item_pack; }
        ItemPack & get_mutable_item_pack() { return item_pack; }
        void set_item_pack(const ItemPack & value) { this->item_pack = value; }

        const QuestPack & get_quest_pack() const { return quest_pack; }
        QuestPack & get_mutable_quest_pack() { return quest_pack; }
        void set_quest_pack(const QuestPack & value) { this->quest_pack = value; }

        const RoomTemplates & get_room_templates() const { return room_templates; }
        RoomTemplates & get_mutable_room_templates() { return room_templates; }
        void set_room_templates(const RoomTemplates & value) { this->room_templates = value; }

        const SkillPack & get_skill_pack() const { return skill_pack; }
        SkillPack & get_mutable_skill_pack() { return skill_pack; }
        void set_skill_pack(const SkillPack & value) { this->skill_pack = value; }

        boost::optional<SpaceVectors> get_space_vectors() const { return space_vectors; }
        void set_space_vectors(boost::optional<SpaceVectors> value) { this->space_vectors = value; }
    };

    class ContentPackBundle {
        public:
        ContentPackBundle() = default;
        virtual ~ContentPackBundle() = default;

        private:
        EnginePackage engine_package;
        std::string generated_at;
        Hashes hashes;
        std::shared_ptr<Packs> packs;
        std::string schema_version;

        public:
        const EnginePackage & get_engine_package() const { return engine_package; }
        EnginePackage & get_mutable_engine_package() { return engine_package; }
        void set_engine_package(const EnginePackage & value) { this->engine_package = value; }

        const std::string & get_generated_at() const { return generated_at; }
        std::string & get_mutable_generated_at() { return generated_at; }
        void set_generated_at(const std::string & value) { this->generated_at = value; }

        const Hashes & get_hashes() const { return hashes; }
        Hashes & get_mutable_hashes() { return hashes; }
        void set_hashes(const Hashes & value) { this->hashes = value; }

        const std::shared_ptr<Packs> & get_packs() const { return packs; }
        std::shared_ptr<Packs> & get_mutable_packs() { return packs; }
        void set_packs(const std::shared_ptr<Packs> & value) { this->packs = value; }

        const std::string & get_schema_version() const { return schema_version; }
        std::string & get_mutable_schema_version() { return schema_version; }
        void set_schema_version(const std::string & value) { this->schema_version = value; }
    };
}

namespace DungeonBreakContracts {
    void from_json(const json & j, EnginePackage & x);
    void to_json(json & j, const EnginePackage & x);

    void from_json(const json & j, Hashes & x);
    void to_json(json & j, const Hashes & x);

    void from_json(const json & j, FeatureSchema & x);
    void to_json(json & j, const FeatureSchema & x);

    void from_json(const json & j, FeatureRef & x);
    void to_json(json & j, const FeatureRef & x);

    void from_json(const json & j, ModelSchema & x);
    void to_json(json & j, const ModelSchema & x);

    void from_json(const json & j, StatDomain & x);
    void to_json(json & j, const StatDomain & x);

    void from_json(const json & j, StatSchema & x);
    void to_json(json & j, const StatSchema & x);

    void from_json(const json & j, ContentSchema & x);
    void to_json(json & j, const ContentSchema & x);

    void from_json(const json & j, ChooseDialogue & x);
    void to_json(json & j, const ChooseDialogue & x);

    void from_json(const json & j, TrainClass & x);
    void to_json(json & j, const TrainClass & x);

    void from_json(const json & j, EquipItem & x);
    void to_json(json & j, const EquipItem & x);

    void from_json(const json & j, EvolveSkill & x);
    void to_json(json & j, const EvolveSkill & x);

    void from_json(const json & j, MurderClass & x);
    void to_json(json & j, const MurderClass & x);

    void from_json(const json & j, EscapeGateClass & x);
    void to_json(json & j, const EscapeGateClass & x);

    void from_json(const json & j, LiveStreamClass & x);
    void to_json(json & j, const LiveStreamClass & x);

    void from_json(const json & j, Move & x);
    void to_json(json & j, const Move & x);

    void from_json(const json & j, ActionSemanticsPurchase & x);
    void to_json(json & j, const ActionSemanticsPurchase & x);

    void from_json(const json & j, ActionSemanticsRest & x);
    void to_json(json & j, const ActionSemanticsRest & x);

    void from_json(const json & j, Search & x);
    void to_json(json & j, const Search & x);

    void from_json(const json & j, UseItemClass & x);
    void to_json(json & j, const UseItemClass & x);

    void from_json(const json & j, ActionSemantics & x);
    void to_json(json & j, const ActionSemantics & x);

    void from_json(const json & j, ActionStyle & x);
    void to_json(json & j, const ActionStyle & x);

    void from_json(const json & j, EventStyle & x);
    void to_json(json & j, const EventStyle & x);

    void from_json(const json & j, RoomStyle & x);
    void to_json(json & j, const RoomStyle & x);

    void from_json(const json & j, BehaviorDefaults & x);
    void to_json(json & j, const BehaviorDefaults & x);

    void from_json(const json & j, VectorProfile & x);
    void to_json(json & j, const VectorProfile & x);

    void from_json(const json & j, ContentFeature & x);
    void to_json(json & j, const ContentFeature & x);

    void from_json(const json & j, EntityProjection & x);
    void to_json(json & j, const EntityProjection & x);

    void from_json(const json & j, Deterministic & x);
    void to_json(json & j, const Deterministic & x);

    void from_json(const json & j, Emergent & x);
    void to_json(json & j, const Emergent & x);

    void from_json(const json & j, Kind & x);
    void to_json(json & j, const Kind & x);

    void from_json(const json & j, TurnIndex & x);
    void to_json(json & j, const TurnIndex & x);

    void from_json(const json & j, Metric & x);
    void to_json(json & j, const Metric & x);

    void from_json(const json & j, EventSemantics & x);
    void to_json(json & j, const EventSemantics & x);

    void from_json(const json & j, Epic & x);
    void to_json(json & j, const Epic & x);

    void from_json(const json & j, Rare & x);
    void to_json(json & j, const Rare & x);

    void from_json(const json & j, RarityWeights & x);
    void to_json(json & j, const RarityWeights & x);

    void from_json(const json & j, Potion & x);
    void to_json(json & j, const Potion & x);

    void from_json(const json & j, Treasure & x);
    void to_json(json & j, const Treasure & x);

    void from_json(const json & j, Weapon & x);
    void to_json(json & j, const Weapon & x);

    void from_json(const json & j, TagWeights & x);
    void to_json(json & j, const TagWeights & x);

    void from_json(const json & j, ItemSemantics & x);
    void to_json(json & j, const ItemSemantics & x);

    void from_json(const json & j, LevelSemantics & x);
    void to_json(json & j, const LevelSemantics & x);

    void from_json(const json & j, FeatureProfile & x);
    void to_json(json & j, const FeatureProfile & x);

    void from_json(const json & j, PowerFeature & x);
    void to_json(json & j, const PowerFeature & x);

    void from_json(const json & j, Corridor & x);
    void to_json(json & j, const Corridor & x);

    void from_json(const json & j, StairsUp & x);
    void to_json(json & j, const StairsUp & x);

    void from_json(const json & j, Start & x);
    void to_json(json & j, const Start & x);

    void from_json(const json & j, Training & x);
    void to_json(json & j, const Training & x);

    void from_json(const json & j, RoomSemantics & x);
    void to_json(json & j, const RoomSemantics & x);

    void from_json(const json & j, SpaceVectors & x);
    void to_json(json & j, const SpaceVectors & x);

    void from_json(const json & j, Action & x);
    void to_json(json & j, const Action & x);

    void from_json(const json & j, ActionCatalog & x);
    void to_json(json & j, const ActionCatalog & x);

    void from_json(const json & j, DropItemFeatureDelta & x);
    void to_json(json & j, const DropItemFeatureDelta & x);

    void from_json(const json & j, DropItemClass & x);
    void to_json(json & j, const DropItemClass & x);

    void from_json(const json & j, FightTraitDelta & x);
    void to_json(json & j, const FightTraitDelta & x);

    void from_json(const json & j, ActionsFight & x);
    void to_json(json & j, const ActionsFight & x);

    void from_json(const json & j, FleeTraitDelta & x);
    void to_json(json & j, const FleeTraitDelta & x);

    void from_json(const json & j, ActionsFlee & x);
    void to_json(json & j, const ActionsFlee & x);

    void from_json(const json & j, LiveStreamTraitDelta & x);
    void to_json(json & j, const LiveStreamTraitDelta & x);

    void from_json(const json & j, LiveStream & x);
    void to_json(json & j, const LiveStream & x);

    void from_json(const json & j, MurderTraitDelta & x);
    void to_json(json & j, const MurderTraitDelta & x);

    void from_json(const json & j, Murder & x);
    void to_json(json & j, const Murder & x);

    void from_json(const json & j, PurchaseFeatureDelta & x);
    void to_json(json & j, const PurchaseFeatureDelta & x);

    void from_json(const json & j, PurchaseTraitDelta & x);
    void to_json(json & j, const PurchaseTraitDelta & x);

    void from_json(const json & j, ActionsPurchase & x);
    void to_json(json & j, const ActionsPurchase & x);

    void from_json(const json & j, RecruitFeatureDelta & x);
    void to_json(json & j, const RecruitFeatureDelta & x);

    void from_json(const json & j, TraitDelta & x);
    void to_json(json & j, const TraitDelta & x);

    void from_json(const json & j, Recruit & x);
    void to_json(json & j, const Recruit & x);

    void from_json(const json & j, RestTraitDelta & x);
    void to_json(json & j, const RestTraitDelta & x);

    void from_json(const json & j, ActionsRest & x);
    void to_json(json & j, const ActionsRest & x);

    void from_json(const json & j, SearchEmptyTraitDelta & x);
    void to_json(json & j, const SearchEmptyTraitDelta & x);

    void from_json(const json & j, SearchEmpty & x);
    void to_json(json & j, const SearchEmpty & x);

    void from_json(const json & j, StealFeatureDelta & x);
    void to_json(json & j, const StealFeatureDelta & x);

    void from_json(const json & j, Steal & x);
    void to_json(json & j, const Steal & x);

    void from_json(const json & j, PurpleTraitDelta & x);
    void to_json(json & j, const PurpleTraitDelta & x);

    void from_json(const json & j, Talk & x);
    void to_json(json & j, const Talk & x);

    void from_json(const json & j, TrainTraitDelta & x);
    void to_json(json & j, const TrainTraitDelta & x);

    void from_json(const json & j, Train & x);
    void to_json(json & j, const Train & x);

    void from_json(const json & j, UseItem & x);
    void to_json(json & j, const UseItem & x);

    void from_json(const json & j, Actions & x);
    void to_json(json & j, const Actions & x);

    void from_json(const json & j, DeedProjection & x);
    void to_json(json & j, const DeedProjection & x);

    void from_json(const json & j, EntityPressure & x);
    void to_json(json & j, const EntityPressure & x);

    void from_json(const json & j, ActionContracts & x);
    void to_json(json & j, const ActionContracts & x);

    void from_json(const json & j, Intent & x);
    void to_json(json & j, const Intent & x);

    void from_json(const json & j, ActionIntents & x);
    void to_json(json & j, const ActionIntents & x);

    void from_json(const json & j, Policy & x);
    void to_json(json & j, const Policy & x);

    void from_json(const json & j, ActionPolicies & x);
    void to_json(json & j, const ActionPolicies & x);

    void from_json(const json & j, VisualReference & x);
    void to_json(json & j, const VisualReference & x);

    void from_json(const json & j, Archetype & x);
    void to_json(json & j, const Archetype & x);

    void from_json(const json & j, ArchetypePack & x);
    void to_json(json & j, const ArchetypePack & x);

    void from_json(const json & j, MinCombatStat & x);
    void to_json(json & j, const MinCombatStat & x);

    void from_json(const json & j, Cutscene & x);
    void to_json(json & j, const Cutscene & x);

    void from_json(const json & j, CutscenePack & x);
    void to_json(json & j, const CutscenePack & x);

    void from_json(const json & j, DialogueEntry & x);
    void to_json(json & j, const DialogueEntry & x);

    void from_json(const json & j, PresenterDefaults & x);
    void to_json(json & j, const PresenterDefaults & x);

    void from_json(const json & j, PresenterInitialFeed & x);
    void to_json(json & j, const PresenterInitialFeed & x);

    void from_json(const json & j, PresenterTemplates & x);
    void to_json(json & j, const PresenterTemplates & x);

    void from_json(const json & j, PresenterStrings & x);
    void to_json(json & j, const PresenterStrings & x);

    void from_json(const json & j, DialoguePack & x);
    void to_json(json & j, const DialoguePack & x);

    void from_json(const json & j, DungeonOrigin & x);
    void to_json(json & j, const DungeonOrigin & x);

    void from_json(const json & j, ItemBlueprint & x);
    void to_json(json & j, const ItemBlueprint & x);

    void from_json(const json & j, Exit & x);
    void to_json(json & j, const Exit & x);

    void from_json(const json & j, Transform & x);
    void to_json(json & j, const Transform & x);

    void from_json(const json & j, RoomItem & x);
    void to_json(json & j, const RoomItem & x);

    void from_json(const json & j, Room & x);
    void to_json(json & j, const Room & x);

    void from_json(const json & j, Level & x);
    void to_json(json & j, const Level & x);

    void from_json(const json & j, RoomBlueprint & x);
    void to_json(json & j, const RoomBlueprint & x);

    void from_json(const json & j, Dungeon & x);
    void to_json(json & j, const Dungeon & x);

    void from_json(const json & j, DungeonLayouts & x);
    void to_json(json & j, const DungeonLayouts & x);

    void from_json(const json & j, Trigger & x);
    void to_json(json & j, const Trigger & x);

    void from_json(const json & j, Event & x);
    void to_json(json & j, const Event & x);

    void from_json(const json & j, EventPack & x);
    void to_json(json & j, const EventPack & x);

    void from_json(const json & j, ItemPackItem & x);
    void to_json(json & j, const ItemPackItem & x);

    void from_json(const json & j, ItemPack & x);
    void to_json(json & j, const ItemPack & x);

    void from_json(const json & j, ProgressRule & x);
    void to_json(json & j, const ProgressRule & x);

    void from_json(const json & j, RequiredProgress & x);
    void to_json(json & j, const RequiredProgress & x);

    void from_json(const json & j, Quest & x);
    void to_json(json & j, const Quest & x);

    void from_json(const json & j, QuestPack & x);
    void to_json(json & j, const QuestPack & x);

    void from_json(const json & j, Template & x);
    void to_json(json & j, const Template & x);

    void from_json(const json & j, RoomTemplates & x);
    void to_json(json & j, const RoomTemplates & x);

    void from_json(const json & j, Requirement & x);
    void to_json(json & j, const Requirement & x);

    void from_json(const json & j, Skill & x);
    void to_json(json & j, const Skill & x);

    void from_json(const json & j, SkillPack & x);
    void to_json(json & j, const SkillPack & x);

    void from_json(const json & j, ContentSource & x);
    void to_json(json & j, const ContentSource & x);

    void from_json(const json & j, Packs & x);
    void to_json(json & j, const Packs & x);

    void from_json(const json & j, ContentPackBundle & x);
    void to_json(json & j, const ContentPackBundle & x);

    void from_json(const json & j, TriggerKind & x);
    void to_json(json & j, const TriggerKind & x);

    inline void from_json(const json & j, EnginePackage& x) {
        x.set_name(j.at("name").get<std::string>());
        x.set_version(j.at("version").get<std::string>());
    }

    inline void to_json(json & j, const EnginePackage & x) {
        j = json::object();
        j["name"] = x.get_name();
        j["version"] = x.get_version();
    }

    inline void from_json(const json & j, Hashes& x) {
        x.set_action_catalog(j.at("actionCatalog").get<std::string>());
        x.set_action_contracts(j.at("actionContracts").get<std::string>());
        x.set_action_intents(j.at("actionIntents").get<std::string>());
        x.set_action_policies(j.at("actionPolicies").get<std::string>());
        x.set_archetype_pack(j.at("archetypePack").get<std::string>());
        x.set_content_schema(j.at("contentSchema").get<std::string>());
        x.set_content_source(j.at("contentSource").get<std::string>());
        x.set_cutscene_pack(j.at("cutscenePack").get<std::string>());
        x.set_dialogue_pack(j.at("dialoguePack").get<std::string>());
        x.set_dungeon_layouts(j.at("dungeonLayouts").get<std::string>());
        x.set_event_pack(j.at("eventPack").get<std::string>());
        x.set_item_pack(j.at("itemPack").get<std::string>());
        x.set_overall(j.at("overall").get<std::string>());
        x.set_quest_pack(j.at("questPack").get<std::string>());
        x.set_room_templates(j.at("roomTemplates").get<std::string>());
        x.set_skill_pack(j.at("skillPack").get<std::string>());
        x.set_space_vectors(j.at("spaceVectors").get<std::string>());
    }

    inline void to_json(json & j, const Hashes & x) {
        j = json::object();
        j["actionCatalog"] = x.get_action_catalog();
        j["actionContracts"] = x.get_action_contracts();
        j["actionIntents"] = x.get_action_intents();
        j["actionPolicies"] = x.get_action_policies();
        j["archetypePack"] = x.get_archetype_pack();
        j["contentSchema"] = x.get_content_schema();
        j["contentSource"] = x.get_content_source();
        j["cutscenePack"] = x.get_cutscene_pack();
        j["dialoguePack"] = x.get_dialogue_pack();
        j["dungeonLayouts"] = x.get_dungeon_layouts();
        j["eventPack"] = x.get_event_pack();
        j["itemPack"] = x.get_item_pack();
        j["overall"] = x.get_overall();
        j["questPack"] = x.get_quest_pack();
        j["roomTemplates"] = x.get_room_templates();
        j["skillPack"] = x.get_skill_pack();
        j["spaceVectors"] = x.get_space_vectors();
    }

    inline void from_json(const json & j, FeatureSchema& x) {
        x.set_default_value(j.at("defaultValue").get<int64_t>());
        x.set_feature_id(j.at("featureId").get<std::string>());
        x.set_groups(j.at("groups").get<std::vector<std::string>>());
        x.set_label(j.at("label").get<std::string>());
    }

    inline void to_json(json & j, const FeatureSchema & x) {
        j = json::object();
        j["defaultValue"] = x.get_default_value();
        j["featureId"] = x.get_feature_id();
        j["groups"] = x.get_groups();
        j["label"] = x.get_label();
    }

    inline void from_json(const json & j, FeatureRef& x) {
        x.set_feature_id(j.at("featureId").get<std::string>());
        x.set_required(get_stack_optional<bool>(j, "required"));
    }

    inline void to_json(json & j, const FeatureRef & x) {
        j = json::object();
        j["featureId"] = x.get_feature_id();
        j["required"] = x.get_required();
    }

    inline void from_json(const json & j, ModelSchema& x) {
        x.set_description(j.at("description").get<std::string>());
        x.set_feature_refs(j.at("featureRefs").get<std::vector<FeatureRef>>());
        x.set_label(j.at("label").get<std::string>());
        x.set_model_id(j.at("modelId").get<std::string>());
    }

    inline void to_json(json & j, const ModelSchema & x) {
        j = json::object();
        j["description"] = x.get_description();
        j["featureRefs"] = x.get_feature_refs();
        j["label"] = x.get_label();
        j["modelId"] = x.get_model_id();
    }

    inline void from_json(const json & j, StatDomain& x) {
        x.set_entity_key_field(j.at("entityKeyField").get<std::string>());
        x.set_generated_key_export(j.at("generatedKeyExport").get<std::string>());
        x.set_lookup_id_field(j.at("lookupIdField").get<std::string>());
        x.set_lookup_pack(j.at("lookupPack").get<std::string>());
    }

    inline void to_json(json & j, const StatDomain & x) {
        j = json::object();
        j["entityKeyField"] = x.get_entity_key_field();
        j["generatedKeyExport"] = x.get_generated_key_export();
        j["lookupIdField"] = x.get_lookup_id_field();
        j["lookupPack"] = x.get_lookup_pack();
    }

    inline void from_json(const json & j, StatSchema& x) {
        x.set_combat(j.at("combat").get<StatDomain>());
        x.set_narrative(j.at("narrative").get<StatDomain>());
        x.set_rune(j.at("rune").get<StatDomain>());
        x.set_skill(j.at("skill").get<StatDomain>());
    }

    inline void to_json(json & j, const StatSchema & x) {
        j = json::object();
        j["combat"] = x.get_combat();
        j["narrative"] = x.get_narrative();
        j["rune"] = x.get_rune();
        j["skill"] = x.get_skill();
    }

    inline void from_json(const json & j, ContentSchema& x) {
        x.set_schema(j.at("$schema").get<std::string>());
        x.set_feature_schema(j.at("featureSchema").get<std::vector<FeatureSchema>>());
        x.set_model_schemas(j.at("modelSchemas").get<std::vector<ModelSchema>>());
        x.set_schema_version(j.at("schemaVersion").get<std::string>());
        x.set_stat_schema(j.at("statSchema").get<StatSchema>());
    }

    inline void to_json(json & j, const ContentSchema & x) {
        j = json::object();
        j["$schema"] = x.get_schema();
        j["featureSchema"] = x.get_feature_schema();
        j["modelSchemas"] = x.get_model_schemas();
        j["schemaVersion"] = x.get_schema_version();
        j["statSchema"] = x.get_stat_schema();
    }

    inline void from_json(const json & j, ChooseDialogue& x) {
        x.set_exploration_intensity(j.at("explorationIntensity").get<double>());
        x.set_social_intensity(j.at("socialIntensity").get<double>());
    }

    inline void to_json(json & j, const ChooseDialogue & x) {
        j = json::object();
        j["explorationIntensity"] = x.get_exploration_intensity();
        j["socialIntensity"] = x.get_social_intensity();
    }

    inline void from_json(const json & j, TrainClass& x) {
        x.set_combat_intensity(get_stack_optional<double>(j, "combatIntensity"));
        x.set_crafting_intensity(j.at("craftingIntensity").get<double>());
        x.set_pressure(j.at("pressure").get<double>());
        x.set_risk(j.at("risk").get<double>());
    }

    inline void to_json(json & j, const TrainClass & x) {
        j = json::object();
        j["combatIntensity"] = x.get_combat_intensity();
        j["craftingIntensity"] = x.get_crafting_intensity();
        j["pressure"] = x.get_pressure();
        j["risk"] = x.get_risk();
    }

    inline void from_json(const json & j, EquipItem& x) {
        x.set_crafting_intensity(j.at("craftingIntensity").get<double>());
        x.set_pressure(j.at("pressure").get<double>());
    }

    inline void to_json(json & j, const EquipItem & x) {
        j = json::object();
        j["craftingIntensity"] = x.get_crafting_intensity();
        j["pressure"] = x.get_pressure();
    }

    inline void from_json(const json & j, EvolveSkill& x) {
        x.set_crafting_intensity(j.at("craftingIntensity").get<double>());
        x.set_pressure(j.at("pressure").get<double>());
        x.set_visibility(j.at("visibility").get<double>());
    }

    inline void to_json(json & j, const EvolveSkill & x) {
        j = json::object();
        j["craftingIntensity"] = x.get_crafting_intensity();
        j["pressure"] = x.get_pressure();
        j["visibility"] = x.get_visibility();
    }

    inline void from_json(const json & j, MurderClass& x) {
        x.set_combat_intensity(j.at("combatIntensity").get<double>());
        x.set_pressure(j.at("pressure").get<double>());
        x.set_risk(j.at("risk").get<double>());
        x.set_social_intensity(get_stack_optional<double>(j, "socialIntensity"));
    }

    inline void to_json(json & j, const MurderClass & x) {
        j = json::object();
        j["combatIntensity"] = x.get_combat_intensity();
        j["pressure"] = x.get_pressure();
        j["risk"] = x.get_risk();
        j["socialIntensity"] = x.get_social_intensity();
    }

    inline void from_json(const json & j, EscapeGateClass& x) {
        x.set_mobility(j.at("mobility").get<double>());
        x.set_pressure(j.at("pressure").get<double>());
        x.set_risk(j.at("risk").get<double>());
    }

    inline void to_json(json & j, const EscapeGateClass & x) {
        j = json::object();
        j["mobility"] = x.get_mobility();
        j["pressure"] = x.get_pressure();
        j["risk"] = x.get_risk();
    }

    inline void from_json(const json & j, LiveStreamClass& x) {
        x.set_pressure(get_stack_optional<double>(j, "pressure"));
        x.set_risk(get_stack_optional<double>(j, "risk"));
        x.set_social_intensity(get_stack_optional<double>(j, "socialIntensity"));
        x.set_visibility(j.at("visibility").get<double>());
    }

    inline void to_json(json & j, const LiveStreamClass & x) {
        j = json::object();
        j["pressure"] = x.get_pressure();
        j["risk"] = x.get_risk();
        j["socialIntensity"] = x.get_social_intensity();
        j["visibility"] = x.get_visibility();
    }

    inline void from_json(const json & j, Move& x) {
        x.set_exploration_intensity(j.at("explorationIntensity").get<double>());
        x.set_mobility(j.at("mobility").get<double>());
        x.set_risk(j.at("risk").get<double>());
    }

    inline void to_json(json & j, const Move & x) {
        j = json::object();
        j["explorationIntensity"] = x.get_exploration_intensity();
        j["mobility"] = x.get_mobility();
        j["risk"] = x.get_risk();
    }

    inline void from_json(const json & j, ActionSemanticsPurchase& x) {
        x.set_crafting_intensity(j.at("craftingIntensity").get<double>());
        x.set_risk(j.at("risk").get<double>());
        x.set_social_intensity(j.at("socialIntensity").get<double>());
    }

    inline void to_json(json & j, const ActionSemanticsPurchase & x) {
        j = json::object();
        j["craftingIntensity"] = x.get_crafting_intensity();
        j["risk"] = x.get_risk();
        j["socialIntensity"] = x.get_social_intensity();
    }

    inline void from_json(const json & j, ActionSemanticsRest& x) {
        x.set_pressure(j.at("pressure").get<double>());
        x.set_recovery_intensity(j.at("recoveryIntensity").get<double>());
        x.set_risk(j.at("risk").get<double>());
    }

    inline void to_json(json & j, const ActionSemanticsRest & x) {
        j = json::object();
        j["pressure"] = x.get_pressure();
        j["recoveryIntensity"] = x.get_recovery_intensity();
        j["risk"] = x.get_risk();
    }

    inline void from_json(const json & j, Search& x) {
        x.set_exploration_intensity(j.at("explorationIntensity").get<double>());
        x.set_risk(j.at("risk").get<double>());
        x.set_visibility(j.at("visibility").get<double>());
    }

    inline void to_json(json & j, const Search & x) {
        j = json::object();
        j["explorationIntensity"] = x.get_exploration_intensity();
        j["risk"] = x.get_risk();
        j["visibility"] = x.get_visibility();
    }

    inline void from_json(const json & j, UseItemClass& x) {
        x.set_crafting_intensity(j.at("craftingIntensity").get<double>());
        x.set_recovery_intensity(j.at("recoveryIntensity").get<double>());
        x.set_risk(j.at("risk").get<double>());
    }

    inline void to_json(json & j, const UseItemClass & x) {
        j = json::object();
        j["craftingIntensity"] = x.get_crafting_intensity();
        j["recoveryIntensity"] = x.get_recovery_intensity();
        j["risk"] = x.get_risk();
    }

    inline void from_json(const json & j, ActionSemantics& x) {
        x.set_choose_dialogue(j.at("choose_dialogue").get<ChooseDialogue>());
        x.set_drop_item(j.at("drop_item").get<TrainClass>());
        x.set_equip_item(j.at("equip_item").get<EquipItem>());
        x.set_evolve_skill(j.at("evolve_skill").get<EvolveSkill>());
        x.set_fight(j.at("fight").get<MurderClass>());
        x.set_flee(j.at("flee").get<EscapeGateClass>());
        x.set_live_stream(j.at("live_stream").get<LiveStreamClass>());
        x.set_move(j.at("move").get<Move>());
        x.set_murder(j.at("murder").get<MurderClass>());
        x.set_purchase(j.at("purchase").get<ActionSemanticsPurchase>());
        x.set_re_equip(j.at("re_equip").get<EquipItem>());
        x.set_recruit(j.at("recruit").get<LiveStreamClass>());
        x.set_rest(j.at("rest").get<ActionSemanticsRest>());
        x.set_search(j.at("search").get<Search>());
        x.set_speak(j.at("speak").get<LiveStreamClass>());
        x.set_steal(j.at("steal").get<Search>());
        x.set_talk(j.at("talk").get<LiveStreamClass>());
        x.set_train(j.at("train").get<TrainClass>());
        x.set_use_item(j.at("use_item").get<UseItemClass>());
    }

    inline void to_json(json & j, const ActionSemantics & x) {
        j = json::object();
        j["choose_dialogue"] = x.get_choose_dialogue();
        j["drop_item"] = x.get_drop_item();
        j["equip_item"] = x.get_equip_item();
        j["evolve_skill"] = x.get_evolve_skill();
        j["fight"] = x.get_fight();
        j["flee"] = x.get_flee();
        j["live_stream"] = x.get_live_stream();
        j["move"] = x.get_move();
        j["murder"] = x.get_murder();
        j["purchase"] = x.get_purchase();
        j["re_equip"] = x.get_re_equip();
        j["recruit"] = x.get_recruit();
        j["rest"] = x.get_rest();
        j["search"] = x.get_search();
        j["speak"] = x.get_speak();
        j["steal"] = x.get_steal();
        j["talk"] = x.get_talk();
        j["train"] = x.get_train();
        j["use_item"] = x.get_use_item();
    }

    inline void from_json(const json & j, ActionStyle& x) {
        x.set_choose_dialogue(j.at("choose_dialogue").get<std::string>());
        x.set_evolve_skill(j.at("evolve_skill").get<std::string>());
        x.set_fight(j.at("fight").get<std::string>());
        x.set_flee(j.at("flee").get<std::string>());
        x.set_live_stream(j.at("live_stream").get<std::string>());
        x.set_purchase(j.at("purchase").get<std::string>());
        x.set_rest(j.at("rest").get<std::string>());
        x.set_search(j.at("search").get<std::string>());
        x.set_talk(j.at("talk").get<std::string>());
        x.set_train(j.at("train").get<std::string>());
    }

    inline void to_json(json & j, const ActionStyle & x) {
        j = json::object();
        j["choose_dialogue"] = x.get_choose_dialogue();
        j["evolve_skill"] = x.get_evolve_skill();
        j["fight"] = x.get_fight();
        j["flee"] = x.get_flee();
        j["live_stream"] = x.get_live_stream();
        j["purchase"] = x.get_purchase();
        j["rest"] = x.get_rest();
        j["search"] = x.get_search();
        j["talk"] = x.get_talk();
        j["train"] = x.get_train();
    }

    inline void from_json(const json & j, EventStyle& x) {
        x.set_deterministic(j.at("deterministic").get<std::string>());
        x.set_emergent(j.at("emergent").get<std::string>());
    }

    inline void to_json(json & j, const EventStyle & x) {
        j = json::object();
        j["deterministic"] = x.get_deterministic();
        j["emergent"] = x.get_emergent();
    }

    inline void from_json(const json & j, RoomStyle& x) {
        x.set_combat(j.at("combat").get<std::string>());
        x.set_rest(j.at("rest").get<std::string>());
    }

    inline void to_json(json & j, const RoomStyle & x) {
        j = json::object();
        j["combat"] = x.get_combat();
        j["rest"] = x.get_rest();
    }

    inline void from_json(const json & j, BehaviorDefaults& x) {
        x.set_action_style(j.at("actionStyle").get<ActionStyle>());
        x.set_event_style(j.at("eventStyle").get<EventStyle>());
        x.set_room_style(j.at("roomStyle").get<RoomStyle>());
        x.set_step_seconds(j.at("stepSeconds").get<int64_t>());
        x.set_window_seconds(j.at("windowSeconds").get<int64_t>());
    }

    inline void to_json(json & j, const BehaviorDefaults & x) {
        j = json::object();
        j["actionStyle"] = x.get_action_style();
        j["eventStyle"] = x.get_event_style();
        j["roomStyle"] = x.get_room_style();
        j["stepSeconds"] = x.get_step_seconds();
        j["windowSeconds"] = x.get_window_seconds();
    }

    inline void from_json(const json & j, VectorProfile& x) {
        x.set_comprehension(get_stack_optional<double>(j, "Comprehension"));
        x.set_constraint(get_stack_optional<double>(j, "Constraint"));
        x.set_construction(get_stack_optional<double>(j, "Construction"));
        x.set_direction(get_stack_optional<double>(j, "Direction"));
        x.set_empathy(get_stack_optional<double>(j, "Empathy"));
        x.set_equilibrium(get_stack_optional<double>(j, "Equilibrium"));
        x.set_freedom(get_stack_optional<double>(j, "Freedom"));
        x.set_levity(get_stack_optional<double>(j, "Levity"));
        x.set_projection(get_stack_optional<double>(j, "Projection"));
        x.set_survival(get_stack_optional<double>(j, "Survival"));
    }

    inline void to_json(json & j, const VectorProfile & x) {
        j = json::object();
        j["Comprehension"] = x.get_comprehension();
        j["Constraint"] = x.get_constraint();
        j["Construction"] = x.get_construction();
        j["Direction"] = x.get_direction();
        j["Empathy"] = x.get_empathy();
        j["Equilibrium"] = x.get_equilibrium();
        j["Freedom"] = x.get_freedom();
        j["Levity"] = x.get_levity();
        j["Projection"] = x.get_projection();
        j["Survival"] = x.get_survival();
    }

    inline void from_json(const json & j, ContentFeature& x) {
        x.set_basis_id(j.at("basisId").get<std::string>());
        x.set_description(j.at("description").get<std::string>());
        x.set_label(j.at("label").get<std::string>());
        x.set_traits(j.at("traits").get<VectorProfile>());
    }

    inline void to_json(json & j, const ContentFeature & x) {
        j = json::object();
        j["basisId"] = x.get_basis_id();
        j["description"] = x.get_description();
        j["label"] = x.get_label();
        j["traits"] = x.get_traits();
    }

    inline void from_json(const json & j, EntityProjection& x) {
        x.set_health_risk_scale(j.at("healthRiskScale").get<int64_t>());
        x.set_mana_recovery_scale(j.at("manaRecoveryScale").get<int64_t>());
        x.set_pressure_health_scale(j.at("pressureHealthScale").get<double>());
        x.set_pressure_reputation_scale(j.at("pressureReputationScale").get<double>());
        x.set_reputation_visibility_scale(j.at("reputationVisibilityScale").get<double>());
    }

    inline void to_json(json & j, const EntityProjection & x) {
        j = json::object();
        j["healthRiskScale"] = x.get_health_risk_scale();
        j["manaRecoveryScale"] = x.get_mana_recovery_scale();
        j["pressureHealthScale"] = x.get_pressure_health_scale();
        j["pressureReputationScale"] = x.get_pressure_reputation_scale();
        j["reputationVisibilityScale"] = x.get_reputation_visibility_scale();
    }

    inline void from_json(const json & j, Deterministic& x) {
        x.set_pressure(j.at("pressure").get<double>());
    }

    inline void to_json(json & j, const Deterministic & x) {
        j = json::object();
        j["pressure"] = x.get_pressure();
    }

    inline void from_json(const json & j, Emergent& x) {
        x.set_exploration_intensity(j.at("explorationIntensity").get<double>());
        x.set_risk(j.at("risk").get<double>());
    }

    inline void to_json(json & j, const Emergent & x) {
        j = json::object();
        j["explorationIntensity"] = x.get_exploration_intensity();
        j["risk"] = x.get_risk();
    }

    inline void from_json(const json & j, Kind& x) {
        x.set_deterministic(j.at("deterministic").get<Deterministic>());
        x.set_emergent(j.at("emergent").get<Emergent>());
    }

    inline void to_json(json & j, const Kind & x) {
        j = json::object();
        j["deterministic"] = x.get_deterministic();
        j["emergent"] = x.get_emergent();
    }

    inline void from_json(const json & j, TurnIndex& x) {
        x.set_exploration_intensity(j.at("explorationIntensity").get<double>());
        x.set_pressure(j.at("pressure").get<double>());
        x.set_risk(j.at("risk").get<double>());
    }

    inline void to_json(json & j, const TurnIndex & x) {
        j = json::object();
        j["explorationIntensity"] = x.get_exploration_intensity();
        j["pressure"] = x.get_pressure();
        j["risk"] = x.get_risk();
    }

    inline void from_json(const json & j, Metric& x) {
        x.set_player_feature(j.at("player_feature").get<LiveStreamClass>());
        x.set_turn_index(j.at("turn_index").get<TurnIndex>());
    }

    inline void to_json(json & j, const Metric & x) {
        j = json::object();
        j["player_feature"] = x.get_player_feature();
        j["turn_index"] = x.get_turn_index();
    }

    inline void from_json(const json & j, EventSemantics& x) {
        x.set_kind(j.at("kind").get<Kind>());
        x.set_metric(j.at("metric").get<Metric>());
    }

    inline void to_json(json & j, const EventSemantics & x) {
        j = json::object();
        j["kind"] = x.get_kind();
        j["metric"] = x.get_metric();
    }

    inline void from_json(const json & j, Epic& x) {
        x.set_pressure(j.at("pressure").get<double>());
        x.set_visibility(j.at("visibility").get<double>());
    }

    inline void to_json(json & j, const Epic & x) {
        j = json::object();
        j["pressure"] = x.get_pressure();
        j["visibility"] = x.get_visibility();
    }

    inline void from_json(const json & j, Rare& x) {
        x.set_visibility(j.at("visibility").get<double>());
    }

    inline void to_json(json & j, const Rare & x) {
        j = json::object();
        j["visibility"] = x.get_visibility();
    }

    inline void from_json(const json & j, RarityWeights& x) {
        x.set_epic(j.at("epic").get<Epic>());
        x.set_legendary(j.at("legendary").get<LiveStreamClass>());
        x.set_rare(j.at("rare").get<Rare>());
    }

    inline void to_json(json & j, const RarityWeights & x) {
        j = json::object();
        j["epic"] = x.get_epic();
        j["legendary"] = x.get_legendary();
        j["rare"] = x.get_rare();
    }

    inline void from_json(const json & j, Potion& x) {
        x.set_recovery_intensity(j.at("recoveryIntensity").get<double>());
    }

    inline void to_json(json & j, const Potion & x) {
        j = json::object();
        j["recoveryIntensity"] = x.get_recovery_intensity();
    }

    inline void from_json(const json & j, Treasure& x) {
        x.set_exploration_intensity(j.at("explorationIntensity").get<double>());
        x.set_visibility(j.at("visibility").get<double>());
    }

    inline void to_json(json & j, const Treasure & x) {
        j = json::object();
        j["explorationIntensity"] = x.get_exploration_intensity();
        j["visibility"] = x.get_visibility();
    }

    inline void from_json(const json & j, Weapon& x) {
        x.set_combat_intensity(j.at("combatIntensity").get<double>());
        x.set_risk(j.at("risk").get<double>());
    }

    inline void to_json(json & j, const Weapon & x) {
        j = json::object();
        j["combatIntensity"] = x.get_combat_intensity();
        j["risk"] = x.get_risk();
    }

    inline void from_json(const json & j, TagWeights& x) {
        x.set_potion(j.at("potion").get<Potion>());
        x.set_treasure(j.at("treasure").get<Treasure>());
        x.set_weapon(j.at("weapon").get<Weapon>());
    }

    inline void to_json(json & j, const TagWeights & x) {
        j = json::object();
        j["potion"] = x.get_potion();
        j["treasure"] = x.get_treasure();
        j["weapon"] = x.get_weapon();
    }

    inline void from_json(const json & j, ItemSemantics& x) {
        x.set_rarity_weights(j.at("rarityWeights").get<RarityWeights>());
        x.set_tag_weights(j.at("tagWeights").get<TagWeights>());
    }

    inline void to_json(json & j, const ItemSemantics & x) {
        j = json::object();
        j["rarityWeights"] = x.get_rarity_weights();
        j["tagWeights"] = x.get_tag_weights();
    }

    inline void from_json(const json & j, LevelSemantics& x) {
        x.set_combat_room_pressure_scale(j.at("combatRoomPressureScale").get<int64_t>());
        x.set_rest_room_recovery_scale(j.at("restRoomRecoveryScale").get<int64_t>());
    }

    inline void to_json(json & j, const LevelSemantics & x) {
        j = json::object();
        j["combatRoomPressureScale"] = x.get_combat_room_pressure_scale();
        j["restRoomRecoveryScale"] = x.get_rest_room_recovery_scale();
    }

    inline void from_json(const json & j, FeatureProfile& x) {
        x.set_awareness(get_stack_optional<double>(j, "Awareness"));
        x.set_effort(get_stack_optional<int64_t>(j, "Effort"));
        x.set_fame(get_stack_optional<double>(j, "Fame"));
        x.set_guile(get_stack_optional<double>(j, "Guile"));
        x.set_momentum(get_stack_optional<double>(j, "Momentum"));
    }

    inline void to_json(json & j, const FeatureProfile & x) {
        j = json::object();
        j["Awareness"] = x.get_awareness();
        j["Effort"] = x.get_effort();
        j["Fame"] = x.get_fame();
        j["Guile"] = x.get_guile();
        j["Momentum"] = x.get_momentum();
    }

    inline void from_json(const json & j, PowerFeature& x) {
        x.set_basis_id(j.at("basisId").get<std::string>());
        x.set_description(j.at("description").get<std::string>());
        x.set_label(j.at("label").get<std::string>());
        x.set_traits(j.at("traits").get<FeatureProfile>());
    }

    inline void to_json(json & j, const PowerFeature & x) {
        j = json::object();
        j["basisId"] = x.get_basis_id();
        j["description"] = x.get_description();
        j["label"] = x.get_label();
        j["traits"] = x.get_traits();
    }

    inline void from_json(const json & j, Corridor& x) {
        x.set_exploration_intensity(j.at("explorationIntensity").get<double>());
        x.set_mobility(j.at("mobility").get<double>());
    }

    inline void to_json(json & j, const Corridor & x) {
        j = json::object();
        j["explorationIntensity"] = x.get_exploration_intensity();
        j["mobility"] = x.get_mobility();
    }

    inline void from_json(const json & j, StairsUp& x) {
        x.set_exploration_intensity(j.at("explorationIntensity").get<double>());
        x.set_mobility(j.at("mobility").get<double>());
        x.set_pressure(j.at("pressure").get<double>());
    }

    inline void to_json(json & j, const StairsUp & x) {
        j = json::object();
        j["explorationIntensity"] = x.get_exploration_intensity();
        j["mobility"] = x.get_mobility();
        j["pressure"] = x.get_pressure();
    }

    inline void from_json(const json & j, Start& x) {
        x.set_exploration_intensity(j.at("explorationIntensity").get<double>());
        x.set_pressure(j.at("pressure").get<double>());
        x.set_visibility(j.at("visibility").get<double>());
    }

    inline void to_json(json & j, const Start & x) {
        j = json::object();
        j["explorationIntensity"] = x.get_exploration_intensity();
        j["pressure"] = x.get_pressure();
        j["visibility"] = x.get_visibility();
    }

    inline void from_json(const json & j, Training& x) {
        x.set_combat_intensity(j.at("combatIntensity").get<double>());
        x.set_pressure(j.at("pressure").get<double>());
        x.set_recovery_intensity(j.at("recoveryIntensity").get<double>());
    }

    inline void to_json(json & j, const Training & x) {
        j = json::object();
        j["combatIntensity"] = x.get_combat_intensity();
        j["pressure"] = x.get_pressure();
        j["recoveryIntensity"] = x.get_recovery_intensity();
    }

    inline void from_json(const json & j, RoomSemantics& x) {
        x.set_combat(j.at("combat").get<MurderClass>());
        x.set_corridor(j.at("corridor").get<Corridor>());
        x.set_dialogue(j.at("dialogue").get<LiveStreamClass>());
        x.set_escape_gate(j.at("escape_gate").get<EscapeGateClass>());
        x.set_exit(j.at("exit").get<EscapeGateClass>());
        x.set_rest(j.at("rest").get<ActionSemanticsRest>());
        x.set_rune_forge(j.at("rune_forge").get<EvolveSkill>());
        x.set_stairs_down(j.at("stairs_down").get<Move>());
        x.set_stairs_up(j.at("stairs_up").get<StairsUp>());
        x.set_start(j.at("start").get<Start>());
        x.set_training(j.at("training").get<Training>());
        x.set_treasure(j.at("treasure").get<Search>());
    }

    inline void to_json(json & j, const RoomSemantics & x) {
        j = json::object();
        j["combat"] = x.get_combat();
        j["corridor"] = x.get_corridor();
        j["dialogue"] = x.get_dialogue();
        j["escape_gate"] = x.get_escape_gate();
        j["exit"] = x.get_exit();
        j["rest"] = x.get_rest();
        j["rune_forge"] = x.get_rune_forge();
        j["stairs_down"] = x.get_stairs_down();
        j["stairs_up"] = x.get_stairs_up();
        j["start"] = x.get_start();
        j["training"] = x.get_training();
        j["treasure"] = x.get_treasure();
    }

    inline void from_json(const json & j, SpaceVectors& x) {
        x.set_action_semantics(j.at("actionSemantics").get<ActionSemantics>());
        x.set_behavior_defaults(j.at("behaviorDefaults").get<BehaviorDefaults>());
        x.set_content_features(j.at("contentFeatures").get<std::vector<ContentFeature>>());
        x.set_entity_projection(j.at("entityProjection").get<EntityProjection>());
        x.set_event_semantics(j.at("eventSemantics").get<EventSemantics>());
        x.set_feature_schema(get_stack_optional<std::vector<FeatureSchema>>(j, "featureSchema"));
        x.set_item_semantics(j.at("itemSemantics").get<ItemSemantics>());
        x.set_level_semantics(j.at("levelSemantics").get<LevelSemantics>());
        x.set_model_schemas(get_stack_optional<std::vector<ModelSchema>>(j, "modelSchemas"));
        x.set_power_features(j.at("powerFeatures").get<std::vector<PowerFeature>>());
        x.set_room_semantics(j.at("roomSemantics").get<RoomSemantics>());
    }

    inline void to_json(json & j, const SpaceVectors & x) {
        j = json::object();
        j["actionSemantics"] = x.get_action_semantics();
        j["behaviorDefaults"] = x.get_behavior_defaults();
        j["contentFeatures"] = x.get_content_features();
        j["entityProjection"] = x.get_entity_projection();
        j["eventSemantics"] = x.get_event_semantics();
        j["featureSchema"] = x.get_feature_schema();
        j["itemSemantics"] = x.get_item_semantics();
        j["levelSemantics"] = x.get_level_semantics();
        j["modelSchemas"] = x.get_model_schemas();
        j["powerFeatures"] = x.get_power_features();
        j["roomSemantics"] = x.get_room_semantics();
    }

    inline void from_json(const json & j, Action& x) {
        x.set_action_type(j.at("actionType").get<std::string>());
        x.set_group(j.at("group").get<std::string>());
        x.set_requires_encounter(get_stack_optional<bool>(j, "requiresEncounter"));
        x.set_requires_room_feature(get_stack_optional<std::string>(j, "requiresRoomFeature"));
        x.set_requires_target(j.at("requiresTarget").get<bool>());
    }

    inline void to_json(json & j, const Action & x) {
        j = json::object();
        j["actionType"] = x.get_action_type();
        j["group"] = x.get_group();
        j["requiresEncounter"] = x.get_requires_encounter();
        j["requiresRoomFeature"] = x.get_requires_room_feature();
        j["requiresTarget"] = x.get_requires_target();
    }

    inline void from_json(const json & j, ActionCatalog& x) {
        x.set_actions(j.at("actions").get<std::vector<Action>>());
    }

    inline void to_json(json & j, const ActionCatalog & x) {
        j = json::object();
        j["actions"] = x.get_actions();
    }

    inline void from_json(const json & j, DropItemFeatureDelta& x) {
        x.set_momentum(j.at("Momentum").get<double>());
    }

    inline void to_json(json & j, const DropItemFeatureDelta & x) {
        j = json::object();
        j["Momentum"] = x.get_momentum();
    }

    inline void from_json(const json & j, DropItemClass& x) {
        x.set_feature_delta(j.at("featureDelta").get<DropItemFeatureDelta>());
    }

    inline void to_json(json & j, const DropItemClass & x) {
        j = json::object();
        j["featureDelta"] = x.get_feature_delta();
    }

    inline void from_json(const json & j, FightTraitDelta& x) {
        x.set_direction(j.at("Direction").get<double>());
        x.set_survival(j.at("Survival").get<double>());
    }

    inline void to_json(json & j, const FightTraitDelta & x) {
        j = json::object();
        j["Direction"] = x.get_direction();
        j["Survival"] = x.get_survival();
    }

    inline void from_json(const json & j, ActionsFight& x) {
        x.set_feature_delta(j.at("featureDelta").get<DropItemFeatureDelta>());
        x.set_trait_delta(j.at("traitDelta").get<FightTraitDelta>());
        x.set_xp_delta(j.at("xpDelta").get<int64_t>());
    }

    inline void to_json(json & j, const ActionsFight & x) {
        j = json::object();
        j["featureDelta"] = x.get_feature_delta();
        j["traitDelta"] = x.get_trait_delta();
        j["xpDelta"] = x.get_xp_delta();
    }

    inline void from_json(const json & j, FleeTraitDelta& x) {
        x.set_survival(j.at("Survival").get<double>());
    }

    inline void to_json(json & j, const FleeTraitDelta & x) {
        j = json::object();
        j["Survival"] = x.get_survival();
    }

    inline void from_json(const json & j, ActionsFlee& x) {
        x.set_trait_delta(j.at("traitDelta").get<FleeTraitDelta>());
    }

    inline void to_json(json & j, const ActionsFlee & x) {
        j = json::object();
        j["traitDelta"] = x.get_trait_delta();
    }

    inline void from_json(const json & j, LiveStreamTraitDelta& x) {
        x.set_projection(j.at("Projection").get<double>());
    }

    inline void to_json(json & j, const LiveStreamTraitDelta & x) {
        j = json::object();
        j["Projection"] = x.get_projection();
    }

    inline void from_json(const json & j, LiveStream& x) {
        x.set_effort_cost(j.at("effortCost").get<int64_t>());
        x.set_feature_delta(j.at("featureDelta").get<DropItemFeatureDelta>());
        x.set_trait_delta(j.at("traitDelta").get<LiveStreamTraitDelta>());
    }

    inline void to_json(json & j, const LiveStream & x) {
        j = json::object();
        j["effortCost"] = x.get_effort_cost();
        j["featureDelta"] = x.get_feature_delta();
        j["traitDelta"] = x.get_trait_delta();
    }

    inline void from_json(const json & j, MurderTraitDelta& x) {
        x.set_constraint(j.at("Constraint").get<double>());
        x.set_survival(j.at("Survival").get<double>());
    }

    inline void to_json(json & j, const MurderTraitDelta & x) {
        j = json::object();
        j["Constraint"] = x.get_constraint();
        j["Survival"] = x.get_survival();
    }

    inline void from_json(const json & j, Murder& x) {
        x.set_feature_delta(j.at("featureDelta").get<DropItemFeatureDelta>());
        x.set_reputation_delta(j.at("reputationDelta").get<int64_t>());
        x.set_trait_delta(j.at("traitDelta").get<MurderTraitDelta>());
        x.set_xp_delta(j.at("xpDelta").get<int64_t>());
    }

    inline void to_json(json & j, const Murder & x) {
        j = json::object();
        j["featureDelta"] = x.get_feature_delta();
        j["reputationDelta"] = x.get_reputation_delta();
        j["traitDelta"] = x.get_trait_delta();
        j["xpDelta"] = x.get_xp_delta();
    }

    inline void from_json(const json & j, PurchaseFeatureDelta& x) {
        x.set_awareness(j.at("Awareness").get<double>());
        x.set_momentum(j.at("Momentum").get<double>());
    }

    inline void to_json(json & j, const PurchaseFeatureDelta & x) {
        j = json::object();
        j["Awareness"] = x.get_awareness();
        j["Momentum"] = x.get_momentum();
    }

    inline void from_json(const json & j, PurchaseTraitDelta& x) {
        x.set_comprehension(j.at("Comprehension").get<double>());
        x.set_constraint(j.at("Constraint").get<double>());
    }

    inline void to_json(json & j, const PurchaseTraitDelta & x) {
        j = json::object();
        j["Comprehension"] = x.get_comprehension();
        j["Constraint"] = x.get_constraint();
    }

    inline void from_json(const json & j, ActionsPurchase& x) {
        x.set_feature_delta(j.at("featureDelta").get<PurchaseFeatureDelta>());
        x.set_trait_delta(j.at("traitDelta").get<PurchaseTraitDelta>());
    }

    inline void to_json(json & j, const ActionsPurchase & x) {
        j = json::object();
        j["featureDelta"] = x.get_feature_delta();
        j["traitDelta"] = x.get_trait_delta();
    }

    inline void from_json(const json & j, RecruitFeatureDelta& x) {
        x.set_awareness(j.at("Awareness").get<double>());
    }

    inline void to_json(json & j, const RecruitFeatureDelta & x) {
        j = json::object();
        j["Awareness"] = x.get_awareness();
    }

    inline void from_json(const json & j, TraitDelta& x) {
        x.set_empathy(j.at("Empathy").get<double>());
    }

    inline void to_json(json & j, const TraitDelta & x) {
        j = json::object();
        j["Empathy"] = x.get_empathy();
    }

    inline void from_json(const json & j, Recruit& x) {
        x.set_feature_delta(j.at("featureDelta").get<RecruitFeatureDelta>());
        x.set_trait_delta(j.at("traitDelta").get<TraitDelta>());
    }

    inline void to_json(json & j, const Recruit & x) {
        j = json::object();
        j["featureDelta"] = x.get_feature_delta();
        j["traitDelta"] = x.get_trait_delta();
    }

    inline void from_json(const json & j, RestTraitDelta& x) {
        x.set_equilibrium(j.at("Equilibrium").get<double>());
        x.set_levity(j.at("Levity").get<double>());
    }

    inline void to_json(json & j, const RestTraitDelta & x) {
        j = json::object();
        j["Equilibrium"] = x.get_equilibrium();
        j["Levity"] = x.get_levity();
    }

    inline void from_json(const json & j, ActionsRest& x) {
        x.set_mana_delta_base(j.at("manaDeltaBase").get<double>());
        x.set_mana_delta_rest_room(j.at("manaDeltaRestRoom").get<double>());
        x.set_trait_delta(j.at("traitDelta").get<RestTraitDelta>());
    }

    inline void to_json(json & j, const ActionsRest & x) {
        j = json::object();
        j["manaDeltaBase"] = x.get_mana_delta_base();
        j["manaDeltaRestRoom"] = x.get_mana_delta_rest_room();
        j["traitDelta"] = x.get_trait_delta();
    }

    inline void from_json(const json & j, SearchEmptyTraitDelta& x) {
        x.set_comprehension(j.at("Comprehension").get<double>());
    }

    inline void to_json(json & j, const SearchEmptyTraitDelta & x) {
        j = json::object();
        j["Comprehension"] = x.get_comprehension();
    }

    inline void from_json(const json & j, SearchEmpty& x) {
        x.set_trait_delta(j.at("traitDelta").get<SearchEmptyTraitDelta>());
    }

    inline void to_json(json & j, const SearchEmpty & x) {
        j = json::object();
        j["traitDelta"] = x.get_trait_delta();
    }

    inline void from_json(const json & j, StealFeatureDelta& x) {
        x.set_guile(j.at("Guile").get<double>());
    }

    inline void to_json(json & j, const StealFeatureDelta & x) {
        j = json::object();
        j["Guile"] = x.get_guile();
    }

    inline void from_json(const json & j, Steal& x) {
        x.set_feature_delta(j.at("featureDelta").get<StealFeatureDelta>());
        x.set_trait_delta(j.at("traitDelta").get<MurderTraitDelta>());
    }

    inline void to_json(json & j, const Steal & x) {
        j = json::object();
        j["featureDelta"] = x.get_feature_delta();
        j["traitDelta"] = x.get_trait_delta();
    }

    inline void from_json(const json & j, PurpleTraitDelta& x) {
        x.set_comprehension(j.at("Comprehension").get<double>());
        x.set_empathy(j.at("Empathy").get<double>());
    }

    inline void to_json(json & j, const PurpleTraitDelta & x) {
        j = json::object();
        j["Comprehension"] = x.get_comprehension();
        j["Empathy"] = x.get_empathy();
    }

    inline void from_json(const json & j, Talk& x) {
        x.set_feature_delta(j.at("featureDelta").get<RecruitFeatureDelta>());
        x.set_no_target_trait_delta(j.at("noTargetTraitDelta").get<TraitDelta>());
        x.set_trait_delta(j.at("traitDelta").get<PurpleTraitDelta>());
    }

    inline void to_json(json & j, const Talk & x) {
        j = json::object();
        j["featureDelta"] = x.get_feature_delta();
        j["noTargetTraitDelta"] = x.get_no_target_trait_delta();
        j["traitDelta"] = x.get_trait_delta();
    }

    inline void from_json(const json & j, TrainTraitDelta& x) {
        x.set_constraint(j.at("Constraint").get<double>());
        x.set_direction(j.at("Direction").get<double>());
    }

    inline void to_json(json & j, const TrainTraitDelta & x) {
        j = json::object();
        j["Constraint"] = x.get_constraint();
        j["Direction"] = x.get_direction();
    }

    inline void from_json(const json & j, Train& x) {
        x.set_feature_delta(j.at("featureDelta").get<DropItemFeatureDelta>());
        x.set_mana_delta(j.at("manaDelta").get<double>());
        x.set_trait_delta(j.at("traitDelta").get<TrainTraitDelta>());
        x.set_xp_delta(j.at("xpDelta").get<int64_t>());
    }

    inline void to_json(json & j, const Train & x) {
        j = json::object();
        j["featureDelta"] = x.get_feature_delta();
        j["manaDelta"] = x.get_mana_delta();
        j["traitDelta"] = x.get_trait_delta();
        j["xpDelta"] = x.get_xp_delta();
    }

    inline void from_json(const json & j, UseItem& x) {
        x.set_feature_delta(j.at("featureDelta").get<RecruitFeatureDelta>());
        x.set_trait_delta(j.at("traitDelta").get<SearchEmptyTraitDelta>());
    }

    inline void to_json(json & j, const UseItem & x) {
        j = json::object();
        j["featureDelta"] = x.get_feature_delta();
        j["traitDelta"] = x.get_trait_delta();
    }

    inline void from_json(const json & j, Actions& x) {
        x.set_drop_item(j.at("dropItem").get<DropItemClass>());
        x.set_equip_item(j.at("equipItem").get<DropItemClass>());
        x.set_fight(j.at("fight").get<ActionsFight>());
        x.set_flee(j.at("flee").get<ActionsFlee>());
        x.set_live_stream(j.at("liveStream").get<LiveStream>());
        x.set_murder(j.at("murder").get<Murder>());
        x.set_purchase(j.at("purchase").get<ActionsPurchase>());
        x.set_recruit(j.at("recruit").get<Recruit>());
        x.set_re_equip(j.at("reEquip").get<DropItemClass>());
        x.set_rest(j.at("rest").get<ActionsRest>());
        x.set_search_empty(j.at("searchEmpty").get<SearchEmpty>());
        x.set_steal(j.at("steal").get<Steal>());
        x.set_talk(j.at("talk").get<Talk>());
        x.set_train(j.at("train").get<Train>());
        x.set_use_item(j.at("useItem").get<UseItem>());
    }

    inline void to_json(json & j, const Actions & x) {
        j = json::object();
        j["dropItem"] = x.get_drop_item();
        j["equipItem"] = x.get_equip_item();
        j["fight"] = x.get_fight();
        j["flee"] = x.get_flee();
        j["liveStream"] = x.get_live_stream();
        j["murder"] = x.get_murder();
        j["purchase"] = x.get_purchase();
        j["recruit"] = x.get_recruit();
        j["reEquip"] = x.get_re_equip();
        j["rest"] = x.get_rest();
        j["searchEmpty"] = x.get_search_empty();
        j["steal"] = x.get_steal();
        j["talk"] = x.get_talk();
        j["train"] = x.get_train();
        j["useItem"] = x.get_use_item();
    }

    inline void from_json(const json & j, DeedProjection& x) {
        x.set_global_budget(j.at("globalBudget").get<double>());
        x.set_per_feature_cap(j.at("perFeatureCap").get<double>());
    }

    inline void to_json(json & j, const DeedProjection & x) {
        j = json::object();
        j["globalBudget"] = x.get_global_budget();
        j["perFeatureCap"] = x.get_per_feature_cap();
    }

    inline void from_json(const json & j, EntityPressure& x) {
        x.set_cap(j.at("cap").get<int64_t>());
        x.set_count_items_as_entities(j.at("countItemsAsEntities").get<bool>());
    }

    inline void to_json(json & j, const EntityPressure & x) {
        j = json::object();
        j["cap"] = x.get_cap();
        j["countItemsAsEntities"] = x.get_count_items_as_entities();
    }

    inline void from_json(const json & j, ActionContracts& x) {
        x.set_actions(j.at("actions").get<Actions>());
        x.set_canonical_seed_v1(j.at("canonicalSeedV1").get<int64_t>());
        x.set_deed_projection(j.at("deedProjection").get<DeedProjection>());
        x.set_entity_pressure(j.at("entityPressure").get<EntityPressure>());
        x.set_room_influence_scale(j.at("roomInfluenceScale").get<double>());
    }

    inline void to_json(json & j, const ActionContracts & x) {
        j = json::object();
        j["actions"] = x.get_actions();
        j["canonicalSeedV1"] = x.get_canonical_seed_v1();
        j["deedProjection"] = x.get_deed_projection();
        j["entityPressure"] = x.get_entity_pressure();
        j["roomInfluenceScale"] = x.get_room_influence_scale();
    }

    inline void from_json(const json & j, Intent& x) {
        x.set_action_type(j.at("actionType").get<std::string>());
        x.set_ui_intent(j.at("uiIntent").get<std::string>());
        x.set_ui_priority(j.at("uiPriority").get<int64_t>());
        x.set_ui_screen(j.at("uiScreen").get<std::string>());
    }

    inline void to_json(json & j, const Intent & x) {
        j = json::object();
        j["actionType"] = x.get_action_type();
        j["uiIntent"] = x.get_ui_intent();
        j["uiPriority"] = x.get_ui_priority();
        j["uiScreen"] = x.get_ui_screen();
    }

    inline void from_json(const json & j, ActionIntents& x) {
        x.set_intents(j.at("intents").get<std::vector<Intent>>());
    }

    inline void to_json(json & j, const ActionIntents & x) {
        j = json::object();
        j["intents"] = x.get_intents();
    }

    inline void from_json(const json & j, Policy& x) {
        x.set_entity_kind_filter(j.at("entityKindFilter").get<std::vector<std::string>>());
        x.set_label(j.at("label").get<std::string>());
        x.set_policy_id(j.at("policyId").get<std::string>());
        x.set_priority_order(j.at("priorityOrder").get<std::vector<std::string>>());
    }

    inline void to_json(json & j, const Policy & x) {
        j = json::object();
        j["entityKindFilter"] = x.get_entity_kind_filter();
        j["label"] = x.get_label();
        j["policyId"] = x.get_policy_id();
        j["priorityOrder"] = x.get_priority_order();
    }

    inline void from_json(const json & j, ActionPolicies& x) {
        x.set_policies(j.at("policies").get<std::vector<Policy>>());
    }

    inline void to_json(json & j, const ActionPolicies & x) {
        j = json::object();
        j["policies"] = x.get_policies();
    }

    inline void from_json(const json & j, VisualReference& x) {
        x.set_back_sprite_url(get_stack_optional<std::string>(j, "backSpriteUrl"));
        x.set_front_sprite_url(get_stack_optional<std::string>(j, "frontSpriteUrl"));
        x.set_icon_sprite_url(get_stack_optional<std::string>(j, "iconSpriteUrl"));
        x.set_sprite_collection(j.at("spriteCollection").get<std::string>());
    }

    inline void to_json(json & j, const VisualReference & x) {
        j = json::object();
        j["backSpriteUrl"] = x.get_back_sprite_url();
        j["frontSpriteUrl"] = x.get_front_sprite_url();
        j["iconSpriteUrl"] = x.get_icon_sprite_url();
        j["spriteCollection"] = x.get_sprite_collection();
    }

    inline void from_json(const json & j, Archetype& x) {
        x.set_archetype_id(j.at("archetypeId").get<std::string>());
        x.set_description(j.at("description").get<std::string>());
        x.set_label(j.at("label").get<std::string>());
        x.set_narrative_profile(j.at("narrativeProfile").get<std::map<std::string, double>>());
        x.set_preferred_skills(j.at("preferredSkills").get<std::vector<std::string>>());
        x.set_visual(get_stack_optional<VisualReference>(j, "visual"));
    }

    inline void to_json(json & j, const Archetype & x) {
        j = json::object();
        j["archetypeId"] = x.get_archetype_id();
        j["description"] = x.get_description();
        j["label"] = x.get_label();
        j["narrativeProfile"] = x.get_narrative_profile();
        j["preferredSkills"] = x.get_preferred_skills();
        j["visual"] = x.get_visual();
    }

    inline void from_json(const json & j, ArchetypePack& x) {
        x.set_archetypes(j.at("archetypes").get<std::vector<Archetype>>());
    }

    inline void to_json(json & j, const ArchetypePack & x) {
        j = json::object();
        j["archetypes"] = x.get_archetypes();
    }

    inline void from_json(const json & j, MinCombatStat& x) {
        x.set_key(j.at("key").get<std::string>());
        x.set_value(j.at("value").get<double>());
    }

    inline void to_json(json & j, const MinCombatStat & x) {
        j = json::object();
        j["key"] = x.get_key();
        j["value"] = x.get_value();
    }

    inline void from_json(const json & j, Cutscene& x) {
        x.set_cutscene_id(j.at("cutsceneId").get<std::string>());
        x.set_min_combat_stat(get_stack_optional<MinCombatStat>(j, "minCombatStat"));
        x.set_min_fame(get_stack_optional<double>(j, "minFame"));
        x.set_once(j.at("once").get<bool>());
        x.set_required_action_type(get_stack_optional<std::string>(j, "requiredActionType"));
        x.set_required_item_tag(get_stack_optional<std::string>(j, "requiredItemTag"));
        x.set_required_room_feature(get_stack_optional<std::string>(j, "requiredRoomFeature"));
        x.set_required_room_id(get_stack_optional<std::string>(j, "requiredRoomId"));
        x.set_required_skill_id(get_stack_optional<std::string>(j, "requiredSkillId"));
        x.set_text(j.at("text").get<std::string>());
        x.set_title(j.at("title").get<std::string>());
        x.set_trigger_kind(j.at("triggerKind").get<TriggerKind>());
    }

    inline void to_json(json & j, const Cutscene & x) {
        j = json::object();
        j["cutsceneId"] = x.get_cutscene_id();
        j["minCombatStat"] = x.get_min_combat_stat();
        j["minFame"] = x.get_min_fame();
        j["once"] = x.get_once();
        j["requiredActionType"] = x.get_required_action_type();
        j["requiredItemTag"] = x.get_required_item_tag();
        j["requiredRoomFeature"] = x.get_required_room_feature();
        j["requiredRoomId"] = x.get_required_room_id();
        j["requiredSkillId"] = x.get_required_skill_id();
        j["text"] = x.get_text();
        j["title"] = x.get_title();
        j["triggerKind"] = x.get_trigger_kind();
    }

    inline void from_json(const json & j, CutscenePack& x) {
        x.set_cutscenes(j.at("cutscenes").get<std::vector<Cutscene>>());
    }

    inline void to_json(json & j, const CutscenePack & x) {
        j = json::object();
        j["cutscenes"] = x.get_cutscenes();
    }

    inline void from_json(const json & j, DialogueEntry& x) {
        x.set_anchor_vector(get_stack_optional<VectorProfile>(j, "anchorVector"));
        x.set_dialogue_id(j.at("dialogueId").get<std::string>());
        x.set_effect_vector(get_stack_optional<VectorProfile>(j, "effectVector"));
        x.set_label(j.at("label").get<std::string>());
        x.set_line(j.at("line").get<std::string>());
        x.set_next_dialogue_id(get_stack_optional<std::string>(j, "nextDialogueId"));
        x.set_radius(get_stack_optional<double>(j, "radius"));
        x.set_requires_item_tag_absent(get_stack_optional<std::string>(j, "requiresItemTagAbsent"));
        x.set_requires_item_tag_present(get_stack_optional<std::string>(j, "requiresItemTagPresent"));
        x.set_requires_room_feature(get_stack_optional<std::string>(j, "requiresRoomFeature"));
        x.set_requires_skill_id(get_stack_optional<std::string>(j, "requiresSkillId"));
        x.set_response_text(j.at("responseText").get<std::string>());
        x.set_scene_id(get_stack_optional<std::string>(j, "sceneId"));
        x.set_take_item_tag(get_stack_optional<std::string>(j, "takeItemTag"));
    }

    inline void to_json(json & j, const DialogueEntry & x) {
        j = json::object();
        j["anchorVector"] = x.get_anchor_vector();
        j["dialogueId"] = x.get_dialogue_id();
        j["effectVector"] = x.get_effect_vector();
        j["label"] = x.get_label();
        j["line"] = x.get_line();
        j["nextDialogueId"] = x.get_next_dialogue_id();
        j["radius"] = x.get_radius();
        j["requiresItemTagAbsent"] = x.get_requires_item_tag_absent();
        j["requiresItemTagPresent"] = x.get_requires_item_tag_present();
        j["requiresRoomFeature"] = x.get_requires_room_feature();
        j["requiresSkillId"] = x.get_requires_skill_id();
        j["responseText"] = x.get_response_text();
        j["sceneId"] = x.get_scene_id();
        j["takeItemTag"] = x.get_take_item_tag();
    }

    inline void from_json(const json & j, PresenterDefaults& x) {
        x.set_cutscene_title(j.at("cutsceneTitle").get<std::string>());
        x.set_speak_intent_text(j.at("speakIntentText").get<std::string>());
    }

    inline void to_json(json & j, const PresenterDefaults & x) {
        j = json::object();
        j["cutsceneTitle"] = x.get_cutscene_title();
        j["speakIntentText"] = x.get_speak_intent_text();
    }

    inline void from_json(const json & j, PresenterInitialFeed& x) {
        x.set_boot_1(j.at("boot-1").get<std::string>());
        x.set_boot_2(j.at("boot-2").get<std::string>());
        x.set_boot_3__prefix(j.at("boot-3Prefix").get<std::string>());
        x.set_boot_3__suffix(j.at("boot-3Suffix").get<std::string>());
    }

    inline void to_json(json & j, const PresenterInitialFeed & x) {
        j = json::object();
        j["boot-1"] = x.get_boot_1();
        j["boot-2"] = x.get_boot_2();
        j["boot-3Prefix"] = x.get_boot_3__prefix();
        j["boot-3Suffix"] = x.get_boot_3__suffix();
    }

    inline void from_json(const json & j, PresenterTemplates& x) {
        x.set_dialogue_choose(j.at("dialogueChoose").get<std::string>());
        x.set_event_line(j.at("eventLine").get<std::string>());
        x.set_warning_line(j.at("warningLine").get<std::string>());
    }

    inline void to_json(json & j, const PresenterTemplates & x) {
        j = json::object();
        j["dialogueChoose"] = x.get_dialogue_choose();
        j["eventLine"] = x.get_event_line();
        j["warningLine"] = x.get_warning_line();
    }

    inline void from_json(const json & j, PresenterStrings& x) {
        x.set_schema(get_stack_optional<std::string>(j, "$schema"));
        x.set_action_group_titles(j.at("actionGroupTitles").get<std::map<std::string, std::string>>());
        x.set_defaults(j.at("defaults").get<PresenterDefaults>());
        x.set_description(get_stack_optional<std::string>(j, "description"));
        x.set_initial_feed(j.at("initialFeed").get<PresenterInitialFeed>());
        x.set_schema_version(j.at("schemaVersion").get<std::string>());
        x.set_system_action_labels(j.at("systemActionLabels").get<std::map<std::string, std::string>>());
        x.set_templates(j.at("templates").get<PresenterTemplates>());
    }

    inline void to_json(json & j, const PresenterStrings & x) {
        j = json::object();
        j["$schema"] = x.get_schema();
        j["actionGroupTitles"] = x.get_action_group_titles();
        j["defaults"] = x.get_defaults();
        j["description"] = x.get_description();
        j["initialFeed"] = x.get_initial_feed();
        j["schemaVersion"] = x.get_schema_version();
        j["systemActionLabels"] = x.get_system_action_labels();
        j["templates"] = x.get_templates();
    }

    inline void from_json(const json & j, DialoguePack& x) {
        x.set_dialogues(j.at("dialogues").get<std::vector<DialogueEntry>>());
        x.set_presenter_strings(j.at("presenterStrings").get<PresenterStrings>());
    }

    inline void to_json(json & j, const DialoguePack & x) {
        j = json::object();
        j["dialogues"] = x.get_dialogues();
        j["presenterStrings"] = x.get_presenter_strings();
    }

    inline void from_json(const json & j, DungeonOrigin& x) {
        x.set_x(j.at("x").get<double>());
        x.set_y(j.at("y").get<double>());
        x.set_z(j.at("z").get<double>());
    }

    inline void to_json(json & j, const DungeonOrigin & x) {
        j = json::object();
        j["x"] = x.get_x();
        j["y"] = x.get_y();
        j["z"] = x.get_z();
    }

    inline void from_json(const json & j, ItemBlueprint& x) {
        x.set_description(j.at("description").get<std::string>());
        x.set_item_blueprint_id(j.at("itemBlueprintId").get<std::string>());
        x.set_name(j.at("name").get<std::string>());
        x.set_rarity(j.at("rarity").get<std::string>());
        x.set_tags(j.at("tags").get<std::vector<std::string>>());
        x.set_vector_delta(get_stack_optional<std::map<std::string, double>>(j, "vectorDelta"));
    }

    inline void to_json(json & j, const ItemBlueprint & x) {
        j = json::object();
        j["description"] = x.get_description();
        j["itemBlueprintId"] = x.get_item_blueprint_id();
        j["name"] = x.get_name();
        j["rarity"] = x.get_rarity();
        j["tags"] = x.get_tags();
        j["vectorDelta"] = x.get_vector_delta();
    }

    inline void from_json(const json & j, Exit& x) {
        x.set_depth(j.at("depth").get<int64_t>());
        x.set_direction(j.at("direction").get<std::string>());
        x.set_room_id(j.at("roomId").get<std::string>());
    }

    inline void to_json(json & j, const Exit & x) {
        j = json::object();
        j["depth"] = x.get_depth();
        j["direction"] = x.get_direction();
        j["roomId"] = x.get_room_id();
    }

    inline void from_json(const json & j, Transform& x) {
        x.set_position(j.at("position").get<DungeonOrigin>());
        x.set_rotation(j.at("rotation").get<DungeonOrigin>());
        x.set_scale(j.at("scale").get<DungeonOrigin>());
    }

    inline void to_json(json & j, const Transform & x) {
        j = json::object();
        j["position"] = x.get_position();
        j["rotation"] = x.get_rotation();
        j["scale"] = x.get_scale();
    }

    inline void from_json(const json & j, RoomItem& x) {
        x.set_description(j.at("description").get<std::string>());
        x.set_is_present(j.at("isPresent").get<bool>());
        x.set_item_blueprint_id(j.at("itemBlueprintId").get<std::string>());
        x.set_item_id(j.at("itemId").get<std::string>());
        x.set_name(j.at("name").get<std::string>());
        x.set_rarity(j.at("rarity").get<std::string>());
        x.set_tags(j.at("tags").get<std::vector<std::string>>());
        x.set_transform(j.at("transform").get<Transform>());
        x.set_vector_delta(get_stack_optional<std::map<std::string, double>>(j, "vectorDelta"));
    }

    inline void to_json(json & j, const RoomItem & x) {
        j = json::object();
        j["description"] = x.get_description();
        j["isPresent"] = x.get_is_present();
        j["itemBlueprintId"] = x.get_item_blueprint_id();
        j["itemId"] = x.get_item_id();
        j["name"] = x.get_name();
        j["rarity"] = x.get_rarity();
        j["tags"] = x.get_tags();
        j["transform"] = x.get_transform();
        j["vectorDelta"] = x.get_vector_delta();
    }

    inline void from_json(const json & j, Room& x) {
        x.set_base_vector(j.at("baseVector").get<VectorProfile>());
        x.set_column(j.at("column").get<int64_t>());
        x.set_description(j.at("description").get<std::string>());
        x.set_exits(j.at("exits").get<std::vector<Exit>>());
        x.set_feature(j.at("feature").get<std::string>());
        x.set_index(j.at("index").get<int64_t>());
        x.set_items(j.at("items").get<std::vector<RoomItem>>());
        x.set_name(j.at("name").get<std::string>());
        x.set_room_blueprint_id(j.at("roomBlueprintId").get<std::string>());
        x.set_room_id(j.at("roomId").get<std::string>());
        x.set_row(j.at("row").get<int64_t>());
        x.set_transform(j.at("transform").get<Transform>());
    }

    inline void to_json(json & j, const Room & x) {
        j = json::object();
        j["baseVector"] = x.get_base_vector();
        j["column"] = x.get_column();
        j["description"] = x.get_description();
        j["exits"] = x.get_exits();
        j["feature"] = x.get_feature();
        j["index"] = x.get_index();
        j["items"] = x.get_items();
        j["name"] = x.get_name();
        j["roomBlueprintId"] = x.get_room_blueprint_id();
        j["roomId"] = x.get_room_id();
        j["row"] = x.get_row();
        j["transform"] = x.get_transform();
    }

    inline void from_json(const json & j, Level& x) {
        x.set_columns(j.at("columns").get<int64_t>());
        x.set_depth(j.at("depth").get<int64_t>());
        x.set_height_scale(j.at("heightScale").get<double>());
        x.set_rooms(j.at("rooms").get<std::vector<Room>>());
        x.set_rows(j.at("rows").get<int64_t>());
        x.set_transform(j.at("transform").get<Transform>());
    }

    inline void to_json(json & j, const Level & x) {
        j = json::object();
        j["columns"] = x.get_columns();
        j["depth"] = x.get_depth();
        j["heightScale"] = x.get_height_scale();
        j["rooms"] = x.get_rooms();
        j["rows"] = x.get_rows();
        j["transform"] = x.get_transform();
    }

    inline void from_json(const json & j, RoomBlueprint& x) {
        x.set_base_vector(j.at("baseVector").get<VectorProfile>());
        x.set_description(j.at("description").get<std::string>());
        x.set_feature(j.at("feature").get<std::string>());
        x.set_name(j.at("name").get<std::string>());
        x.set_room_blueprint_id(j.at("roomBlueprintId").get<std::string>());
    }

    inline void to_json(json & j, const RoomBlueprint & x) {
        j = json::object();
        j["baseVector"] = x.get_base_vector();
        j["description"] = x.get_description();
        j["feature"] = x.get_feature();
        j["name"] = x.get_name();
        j["roomBlueprintId"] = x.get_room_blueprint_id();
    }

    inline void from_json(const json & j, Dungeon& x) {
        x.set_dungeon_id(j.at("dungeonId").get<std::string>());
        x.set_dungeon_origin(j.at("dungeonOrigin").get<DungeonOrigin>());
        x.set_escape_depth(j.at("escapeDepth").get<int64_t>());
        x.set_escape_room_id(j.at("escapeRoomId").get<std::string>());
        x.set_item_blueprints(j.at("itemBlueprints").get<std::vector<ItemBlueprint>>());
        x.set_levels(j.at("levels").get<std::vector<Level>>());
        x.set_level_spacing(j.at("levelSpacing").get<int64_t>());
        x.set_room_blueprints(j.at("roomBlueprints").get<std::vector<RoomBlueprint>>());
        x.set_room_size(j.at("roomSize").get<DungeonOrigin>());
        x.set_start_depth(j.at("startDepth").get<int64_t>());
        x.set_start_room_id(j.at("startRoomId").get<std::string>());
        x.set_title(j.at("title").get<std::string>());
    }

    inline void to_json(json & j, const Dungeon & x) {
        j = json::object();
        j["dungeonId"] = x.get_dungeon_id();
        j["dungeonOrigin"] = x.get_dungeon_origin();
        j["escapeDepth"] = x.get_escape_depth();
        j["escapeRoomId"] = x.get_escape_room_id();
        j["itemBlueprints"] = x.get_item_blueprints();
        j["levels"] = x.get_levels();
        j["levelSpacing"] = x.get_level_spacing();
        j["roomBlueprints"] = x.get_room_blueprints();
        j["roomSize"] = x.get_room_size();
        j["startDepth"] = x.get_start_depth();
        j["startRoomId"] = x.get_start_room_id();
        j["title"] = x.get_title();
    }

    inline void from_json(const json & j, DungeonLayouts& x) {
        x.set_dungeons(j.at("dungeons").get<std::vector<Dungeon>>());
    }

    inline void to_json(json & j, const DungeonLayouts & x) {
        j = json::object();
        j["dungeons"] = x.get_dungeons();
    }

    inline void from_json(const json & j, Trigger& x) {
        x.set_gte(j.at("gte").get<int64_t>());
        x.set_key(get_stack_optional<std::string>(j, "key"));
        x.set_metric(j.at("metric").get<std::string>());
    }

    inline void to_json(json & j, const Trigger & x) {
        j = json::object();
        j["gte"] = x.get_gte();
        j["key"] = x.get_key();
        j["metric"] = x.get_metric();
    }

    inline void from_json(const json & j, Event& x) {
        x.set_event_id(j.at("eventId").get<std::string>());
        x.set_global_enemy_level_bonus_delta(get_stack_optional<int64_t>(j, "globalEnemyLevelBonusDelta"));
        x.set_kind(j.at("kind").get<std::string>());
        x.set_message(j.at("message").get<std::string>());
        x.set_narrative_stat_delta(get_stack_optional<std::map<std::string, double>>(j, "narrativeStatDelta"));
        x.set_probability(get_stack_optional<double>(j, "probability"));
        x.set_trigger(j.at("trigger").get<Trigger>());
    }

    inline void to_json(json & j, const Event & x) {
        j = json::object();
        j["eventId"] = x.get_event_id();
        j["globalEnemyLevelBonusDelta"] = x.get_global_enemy_level_bonus_delta();
        j["kind"] = x.get_kind();
        j["message"] = x.get_message();
        j["narrativeStatDelta"] = x.get_narrative_stat_delta();
        j["probability"] = x.get_probability();
        j["trigger"] = x.get_trigger();
    }

    inline void from_json(const json & j, EventPack& x) {
        x.set_events(j.at("events").get<std::vector<Event>>());
    }

    inline void to_json(json & j, const EventPack & x) {
        j = json::object();
        j["events"] = x.get_events();
    }

    inline void from_json(const json & j, ItemPackItem& x) {
        x.set_equip_slot_id(get_stack_optional<std::string>(j, "equip_slot_id"));
        x.set_item_id(j.at("itemId").get<std::string>());
        x.set_name(get_stack_optional<std::string>(j, "name"));
        x.set_rarity_id(get_stack_optional<std::string>(j, "rarityId"));
        x.set_tags(j.at("tags").get<std::vector<std::string>>());
        x.set_vector_delta(get_stack_optional<std::map<std::string, double>>(j, "vectorDelta"));
        x.set_visual(get_stack_optional<VisualReference>(j, "visual"));
    }

    inline void to_json(json & j, const ItemPackItem & x) {
        j = json::object();
        j["equip_slot_id"] = x.get_equip_slot_id();
        j["itemId"] = x.get_item_id();
        j["name"] = x.get_name();
        j["rarityId"] = x.get_rarity_id();
        j["tags"] = x.get_tags();
        j["vectorDelta"] = x.get_vector_delta();
        j["visual"] = x.get_visual();
    }

    inline void from_json(const json & j, ItemPack& x) {
        x.set_items(j.at("items").get<std::vector<ItemPackItem>>());
        x.set_rarity_tiers(get_stack_optional<std::vector<std::string>>(j, "rarityTiers"));
    }

    inline void to_json(json & j, const ItemPack & x) {
        j = json::object();
        j["items"] = x.get_items();
        j["rarityTiers"] = x.get_rarity_tiers();
    }

    inline void from_json(const json & j, ProgressRule& x) {
        x.set_action_type(get_stack_optional<std::string>(j, "actionType"));
        x.set_amount(get_stack_optional<int64_t>(j, "amount"));
        x.set_kind(j.at("kind").get<std::string>());
        x.set_set_to_required(get_stack_optional<bool>(j, "setToRequired"));
    }

    inline void to_json(json & j, const ProgressRule & x) {
        j = json::object();
        j["actionType"] = x.get_action_type();
        j["amount"] = x.get_amount();
        j["kind"] = x.get_kind();
        j["setToRequired"] = x.get_set_to_required();
    }

    inline void from_json(const json & j, RequiredProgress& x) {
        x.set_mode(j.at("mode").get<std::string>());
        x.set_value(get_stack_optional<int64_t>(j, "value"));
    }

    inline void to_json(json & j, const RequiredProgress & x) {
        j = json::object();
        j["mode"] = x.get_mode();
        j["value"] = x.get_value();
    }

    inline void from_json(const json & j, Quest& x) {
        x.set_description(j.at("description").get<std::string>());
        x.set_progress_rules(j.at("progressRules").get<std::vector<ProgressRule>>());
        x.set_quest_id(j.at("questId").get<std::string>());
        x.set_required_progress(j.at("requiredProgress").get<RequiredProgress>());
        x.set_title(j.at("title").get<std::string>());
    }

    inline void to_json(json & j, const Quest & x) {
        j = json::object();
        j["description"] = x.get_description();
        j["progressRules"] = x.get_progress_rules();
        j["questId"] = x.get_quest_id();
        j["requiredProgress"] = x.get_required_progress();
        j["title"] = x.get_title();
    }

    inline void from_json(const json & j, QuestPack& x) {
        x.set_quests(j.at("quests").get<std::vector<Quest>>());
    }

    inline void to_json(json & j, const QuestPack & x) {
        j = json::object();
        j["quests"] = x.get_quests();
    }

    inline void from_json(const json & j, Template& x) {
        x.set_base_vector(j.at("baseVector").get<VectorProfile>());
        x.set_feature(j.at("feature").get<std::string>());
    }

    inline void to_json(json & j, const Template & x) {
        j = json::object();
        j["baseVector"] = x.get_base_vector();
        j["feature"] = x.get_feature();
    }

    inline void from_json(const json & j, RoomTemplates& x) {
        x.set_templates(j.at("templates").get<std::vector<Template>>());
    }

    inline void to_json(json & j, const RoomTemplates & x) {
        j = json::object();
        j["templates"] = x.get_templates();
    }

    inline void from_json(const json & j, Requirement& x) {
        x.set_description(j.at("description").get<std::string>());
        x.set_key(get_stack_optional<std::string>(j, "key"));
        x.set_kind(j.at("kind").get<std::string>());
        x.set_value(get_stack_optional<double>(j, "value"));
    }

    inline void to_json(json & j, const Requirement & x) {
        j = json::object();
        j["description"] = x.get_description();
        j["key"] = x.get_key();
        j["kind"] = x.get_kind();
        j["value"] = x.get_value();
    }

    inline void from_json(const json & j, Skill& x) {
        x.set_branch(j.at("branch").get<std::string>());
        x.set_branch_group(get_stack_optional<std::string>(j, "branchGroup"));
        x.set_description(j.at("description").get<std::string>());
        x.set_evolves_from(get_stack_optional<std::string>(j, "evolvesFrom"));
        x.set_exclusive_with(get_stack_optional<std::vector<std::string>>(j, "exclusiveWith"));
        x.set_name(j.at("name").get<std::string>());
        x.set_narrative_profile(j.at("narrativeProfile").get<std::map<std::string, double>>());
        x.set_narrative_stat_bonus(j.at("narrativeStatBonus").get<std::map<std::string, double>>());
        x.set_requires_rune_forge(get_stack_optional<bool>(j, "requiresRuneForge"));
        x.set_skill_id(j.at("skillId").get<std::string>());
        x.set_unlock_radius(j.at("unlockRadius").get<double>());
        x.set_unlock_requirements(j.at("unlockRequirements").get<std::vector<Requirement>>());
        x.set_use_requirements(j.at("useRequirements").get<std::vector<Requirement>>());
        x.set_visual(get_stack_optional<VisualReference>(j, "visual"));
    }

    inline void to_json(json & j, const Skill & x) {
        j = json::object();
        j["branch"] = x.get_branch();
        j["branchGroup"] = x.get_branch_group();
        j["description"] = x.get_description();
        j["evolvesFrom"] = x.get_evolves_from();
        j["exclusiveWith"] = x.get_exclusive_with();
        j["name"] = x.get_name();
        j["narrativeProfile"] = x.get_narrative_profile();
        j["narrativeStatBonus"] = x.get_narrative_stat_bonus();
        j["requiresRuneForge"] = x.get_requires_rune_forge();
        j["skillId"] = x.get_skill_id();
        j["unlockRadius"] = x.get_unlock_radius();
        j["unlockRequirements"] = x.get_unlock_requirements();
        j["useRequirements"] = x.get_use_requirements();
        j["visual"] = x.get_visual();
    }

    inline void from_json(const json & j, SkillPack& x) {
        x.set_skills(j.at("skills").get<std::vector<Skill>>());
    }

    inline void to_json(json & j, const SkillPack & x) {
        j = json::object();
        j["skills"] = x.get_skills();
    }

    inline void from_json(const json & j, ContentSource& x) {
        x.set_schema(j.at("$schema").get<std::string>());
        x.set_content_schema(j.at("contentSchema").get<ContentSchema>());
        x.set_packs(j.at("packs").get<std::shared_ptr<Packs>>());
        x.set_schema_version(j.at("schemaVersion").get<std::string>());
        x.set_vector_runtime(j.at("vectorRuntime").get<SpaceVectors>());
    }

    inline void to_json(json & j, const ContentSource & x) {
        j = json::object();
        j["$schema"] = x.get_schema();
        j["contentSchema"] = x.get_content_schema();
        j["packs"] = x.get_packs();
        j["schemaVersion"] = x.get_schema_version();
        j["vectorRuntime"] = x.get_vector_runtime();
    }

    inline void from_json(const json & j, Packs& x) {
        x.set_action_catalog(j.at("actionCatalog").get<ActionCatalog>());
        x.set_action_contracts(j.at("actionContracts").get<ActionContracts>());
        x.set_action_intents(j.at("actionIntents").get<ActionIntents>());
        x.set_action_policies(j.at("actionPolicies").get<ActionPolicies>());
        x.set_archetype_pack(j.at("archetypePack").get<ArchetypePack>());
        x.set_content_schema(get_stack_optional<ContentSchema>(j, "contentSchema"));
        x.set_content_source(get_heap_optional<ContentSource>(j, "contentSource"));
        x.set_cutscene_pack(j.at("cutscenePack").get<CutscenePack>());
        x.set_dialogue_pack(j.at("dialoguePack").get<DialoguePack>());
        x.set_dungeon_layouts(j.at("dungeonLayouts").get<DungeonLayouts>());
        x.set_event_pack(j.at("eventPack").get<EventPack>());
        x.set_item_pack(j.at("itemPack").get<ItemPack>());
        x.set_quest_pack(j.at("questPack").get<QuestPack>());
        x.set_room_templates(j.at("roomTemplates").get<RoomTemplates>());
        x.set_skill_pack(j.at("skillPack").get<SkillPack>());
        x.set_space_vectors(get_stack_optional<SpaceVectors>(j, "spaceVectors"));
    }

    inline void to_json(json & j, const Packs & x) {
        j = json::object();
        j["actionCatalog"] = x.get_action_catalog();
        j["actionContracts"] = x.get_action_contracts();
        j["actionIntents"] = x.get_action_intents();
        j["actionPolicies"] = x.get_action_policies();
        j["archetypePack"] = x.get_archetype_pack();
        j["contentSchema"] = x.get_content_schema();
        j["contentSource"] = x.get_content_source();
        j["cutscenePack"] = x.get_cutscene_pack();
        j["dialoguePack"] = x.get_dialogue_pack();
        j["dungeonLayouts"] = x.get_dungeon_layouts();
        j["eventPack"] = x.get_event_pack();
        j["itemPack"] = x.get_item_pack();
        j["questPack"] = x.get_quest_pack();
        j["roomTemplates"] = x.get_room_templates();
        j["skillPack"] = x.get_skill_pack();
        j["spaceVectors"] = x.get_space_vectors();
    }

    inline void from_json(const json & j, ContentPackBundle& x) {
        x.set_engine_package(j.at("enginePackage").get<EnginePackage>());
        x.set_generated_at(j.at("generatedAt").get<std::string>());
        x.set_hashes(j.at("hashes").get<Hashes>());
        x.set_packs(j.at("packs").get<std::shared_ptr<Packs>>());
        x.set_schema_version(j.at("schemaVersion").get<std::string>());
    }

    inline void to_json(json & j, const ContentPackBundle & x) {
        j = json::object();
        j["enginePackage"] = x.get_engine_package();
        j["generatedAt"] = x.get_generated_at();
        j["hashes"] = x.get_hashes();
        j["packs"] = x.get_packs();
        j["schemaVersion"] = x.get_schema_version();
    }

    inline void from_json(const json & j, TriggerKind & x) {
        if (j == "chapter_complete") x = TriggerKind::CHAPTER_COMPLETE;
        else if (j == "combat_stat_milestone") x = TriggerKind::COMBAT_STAT_MILESTONE;
        else if (j == "escape") x = TriggerKind::ESCAPE;
        else if (j == "fame_milestone") x = TriggerKind::FAME_MILESTONE;
        else if (j == "item_tag") x = TriggerKind::ITEM_TAG;
        else if (j == "room_entry_feature") x = TriggerKind::ROOM_ENTRY_FEATURE;
        else if (j == "room_entry_room") x = TriggerKind::ROOM_ENTRY_ROOM;
        else if (j == "skill_unlock") x = TriggerKind::SKILL_UNLOCK;
        else { throw std::runtime_error("Input JSON does not conform to schema!"); }
    }

    inline void to_json(json & j, const TriggerKind & x) {
        switch (x) {
            case TriggerKind::CHAPTER_COMPLETE: j = "chapter_complete"; break;
            case TriggerKind::COMBAT_STAT_MILESTONE: j = "combat_stat_milestone"; break;
            case TriggerKind::ESCAPE: j = "escape"; break;
            case TriggerKind::FAME_MILESTONE: j = "fame_milestone"; break;
            case TriggerKind::ITEM_TAG: j = "item_tag"; break;
            case TriggerKind::ROOM_ENTRY_FEATURE: j = "room_entry_feature"; break;
            case TriggerKind::ROOM_ENTRY_ROOM: j = "room_entry_room"; break;
            case TriggerKind::SKILL_UNLOCK: j = "skill_unlock"; break;
            default: throw std::runtime_error("Unexpected value in enumeration \"TriggerKind\": " + std::to_string(static_cast<int>(x)));
        }
    }
}
