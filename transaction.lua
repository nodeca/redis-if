-- Validate conditions and exec commands if ok

local params = cjson.decode(ARGV[1])

-- Check conditions
for __, check in pairs(params["if"]) do
    if #check == 2 then
        if check[1] ~= redis.call(unpack(check[2])) then return 0 end
    elseif check[2] == "==" then
        if check[1] ~= redis.call(unpack(check[3])) then return 0 end
    elseif check[2] == "!=" then
        if check[1] == redis.call(unpack(check[3])) then return 0 end
    elseif check[2] == ">" then
        if check[1] <= redis.call(unpack(check[3])) then return 0 end
    elseif check[2] == "<" then
        if check[1] >= redis.call(unpack(check[3])) then return 0 end
    else
        error('invalid operator "'..tostring(check[2])..'" (expected "==", "!=", ">" or "<")')
    end
end

-- Eval redis commands
for __, exec in pairs(params["exec"]) do
    redis.call(unpack(exec))
end

return 1
