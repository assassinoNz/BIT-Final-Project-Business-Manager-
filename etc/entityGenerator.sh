npx typeorm-model-generator -h localhost -d business_manager -u root -x root -e mysql -o ".";
rm "./ormconfig.json" "./tsconfig.json";
rm -r "../src/entities/main/";
mv "./entities/*" "../src/entities/main/";
rmdir "./entities"
